//! A real file tree for the workspace explorer.
//!
//! The explorer panel used to render a hard-coded `mockFiles` array - `apps/`,
//! `packages/`, `README.md` plus a few invented children - no matter which
//! repository was open, or whether one was open at all. This module replaces
//! that with an actual read-only walk of the current project.
//!
//! Two things are bounded on purpose, because a monorepo can hold hundreds of
//! thousands of files and the panel still has to feel instant: tree depth
//! ([`MAX_DEPTH`]) and total entries ([`MAX_ENTRIES`]). When the entry cap is
//! reached the response says so through `truncated`, rather than quietly
//! presenting a partial tree as a complete one.
//!
//! The walk skips `.git`, dependency directories, build output and caches -
//! pure noise in a browsing panel - but keeps other dot-directories such as
//! `.github`, since for this product CI configuration is part of the project.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::State;

use crate::project::ProjectContext;

/// Deepest directory level the walk descends into.
pub const MAX_DEPTH: usize = 6;

/// Maximum number of entries returned in one call.
pub const MAX_ENTRIES: usize = 2_000;

/// Directories that never help anyone browsing a repository.
const SKIPPED_DIRS: &[&str] = &[
    ".cache",
    ".git",
    ".gradle",
    ".idea",
    ".next",
    ".turbo",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "out",
    "target",
];

/// Per-OS junk files that would otherwise clutter every directory.
const SKIPPED_FILES: &[&str] = &[".DS_Store", "Thumbs.db"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    File,
    Directory,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    /// Path relative to the project root. Always `/`-separated, on Windows too,
    /// so the renderer can build stable keys and display strings from it.
    pub path: String,
    pub kind: FileKind,
    /// Present for directories, except those sitting at the depth cap.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTree {
    /// Absolute path of the project that was walked.
    pub root: String,
    pub nodes: Vec<FileNode>,
    /// True when [`MAX_ENTRIES`] cut the walk short.
    pub truncated: bool,
    /// Depth limit the walk honoured.
    pub max_depth: usize,
}

/// Entry budget, plus a flag recording whether the budget ran out.
#[derive(Debug)]
struct Walker {
    remaining: usize,
    truncated: bool,
}

impl Walker {
    fn new() -> Self {
        Self {
            remaining: MAX_ENTRIES,
            truncated: false,
        }
    }

    /// Claim one entry slot. Returns false once the budget is spent.
    fn take(&mut self) -> bool {
        if self.remaining == 0 {
            self.truncated = true;
            return false;
        }
        self.remaining -= 1;
        true
    }
}

/// Return the file tree of the open project.
///
/// `depth` optionally lowers the default [`MAX_DEPTH`]; it can never raise it.
#[tauri::command]
pub fn list_project_files(
    project: State<'_, ProjectContext>,
    depth: Option<usize>,
) -> Result<ProjectTree, String> {
    let root = project.current()?;
    if !root.is_dir() {
        return Err(format!("{} is not a directory", root.display()));
    }

    let max_depth = clamp_depth(depth);
    let mut walker = Walker::new();
    let nodes = walk(&root, "", max_depth, &mut walker);

    Ok(ProjectTree {
        root: root.display().to_string(),
        nodes,
        truncated: walker.truncated,
        max_depth,
    })
}

fn clamp_depth(depth: Option<usize>) -> usize {
    depth.unwrap_or(MAX_DEPTH).clamp(1, MAX_DEPTH)
}

fn walk(dir: &Path, prefix: &str, depth_left: usize, walker: &mut Walker) -> Vec<FileNode> {
    // An unreadable directory (permissions, a vanished mount, a symlink that does
    // not resolve) must not fail the whole tree.
    let Ok(read) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut entries: Vec<(PathBuf, bool, String)> = read
        .filter_map(Result::ok)
        .map(|entry| {
            let path = entry.path();
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();
            // `is_dir` follows symlinks, so a linked directory is labelled as
            // one. Recursion is bounded by the depth cap, which is what stops a
            // symlink pointing at an ancestor from looping.
            let is_dir = path.is_dir();
            (path, is_dir, name)
        })
        .filter(|(_, _, name)| !name.is_empty())
        .collect();

    entries.sort_by(|a, b| node_order(a.1, &a.2).cmp(&node_order(b.1, &b.2)));

    let mut nodes = Vec::new();
    for (path, is_dir, name) in entries {
        if is_dir {
            if should_skip_dir(&name) {
                continue;
            }
        } else if should_skip_file(&name) {
            continue;
        }
        if !walker.take() {
            break;
        }

        let relative = join_rel(prefix, &name);
        // `bool::then` keeps the recursion lazy: a directory at the depth cap is
        // not walked at all, rather than walked and discarded.
        let children = (is_dir && depth_left > 1)
            .then(|| walk(&path, &relative, depth_left - 1, walker));

        nodes.push(FileNode {
            name,
            path: relative,
            kind: if is_dir {
                FileKind::Directory
            } else {
                FileKind::File
            },
            children,
        });
    }

    nodes
}

/// Directories first, then case-insensitive alphabetical - the ordering every
/// file explorer uses, and stable enough that the panel does not reshuffle
/// between refreshes.
fn node_order(is_dir: bool, name: &str) -> (u8, String) {
    (if is_dir { 0 } else { 1 }, name.to_lowercase())
}

fn should_skip_dir(name: &str) -> bool {
    SKIPPED_DIRS.contains(&name)
}

fn should_skip_file(name: &str) -> bool {
    SKIPPED_FILES.contains(&name)
}

fn join_rel(prefix: &str, name: &str) -> String {
    if prefix.is_empty() {
        name.to_string()
    } else {
        format!("{prefix}/{name}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_noise_directories_but_keeps_ci_configuration() {
        for dir in [
            ".git",
            "node_modules",
            "target",
            "dist",
            "build",
            "out",
            ".next",
            ".turbo",
            "__pycache__",
        ] {
            assert!(should_skip_dir(dir), "{dir} should not be walked into");
        }
        // A dot-directory is not automatically noise: CI config lives in one.
        assert!(!should_skip_dir(".github"));
        assert!(!should_skip_dir("src"));
    }

    #[test]
    fn skips_per_os_junk_files() {
        assert!(should_skip_file(".DS_Store"));
        assert!(should_skip_file("Thumbs.db"));
        assert!(!should_skip_file("README.md"));
        assert!(!should_skip_file(".gitignore"));
    }

    #[test]
    fn relative_paths_use_forward_slashes_on_every_platform() {
        assert_eq!(join_rel("", "src"), "src");
        assert_eq!(join_rel("src", "main.rs"), "src/main.rs");
        assert_eq!(
            join_rel("apps/desktop", "package.json"),
            "apps/desktop/package.json"
        );
    }

    #[test]
    fn directories_sort_before_files_case_insensitively() {
        let mut order = vec![
            node_order(false, "zeta"),
            node_order(false, "Alpha"),
            node_order(true, "src"),
            node_order(true, "Beta"),
        ];
        order.sort();
        assert_eq!(
            order,
            vec![
                (0, "beta".to_string()),
                (0, "src".to_string()),
                (1, "alpha".to_string()),
                (1, "zeta".to_string()),
            ]
        );
    }

    #[test]
    fn walker_records_when_the_entry_cap_is_hit() {
        let mut walker = Walker {
            remaining: 2,
            truncated: false,
        };
        assert!(walker.take());
        assert!(walker.take());
        assert!(!walker.take(), "the third entry must be refused");
        assert!(walker.truncated, "and the refusal must be reported");
        assert_eq!(walker.remaining, 0);
    }

    #[test]
    fn a_fresh_walker_has_the_full_budget() {
        let walker = Walker::new();
        assert_eq!(walker.remaining, MAX_ENTRIES);
        assert!(!walker.truncated);
    }

    #[test]
    fn depth_can_be_lowered_but_never_raised() {
        assert_eq!(clamp_depth(None), MAX_DEPTH);
        assert_eq!(clamp_depth(Some(3)), 3);
        assert_eq!(clamp_depth(Some(1)), 1);
        assert_eq!(clamp_depth(Some(0)), 1, "a zero-depth tree is useless");
        // The renderer cannot ask for an unbounded walk.
        assert_eq!(clamp_depth(Some(99)), MAX_DEPTH);
    }
}
