use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

pub struct PythonRunner;

impl PythonRunner {
    pub async fn execute(script_path: &str, args: Vec<String>) -> Result<String, String> {
        let mut child = Command::new("python")
            .arg(script_path)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn python process: {}", e))?;

        let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
        let reader = BufReader::new(stdout);

        let mut output = String::new();
        for line in reader.lines() {
            output.push_str(&line.map_err(|e| e.to_string())?);
            output.push('\n');
        }

        let status = child.wait().map_err(|e| e.to_string())?;
        if status.success() {
            Ok(output)
        } else {
            let mut stderr = String::new();
            if let Some(mut err) = child.stderr.take() {
                use std::io::Read;
                err.read_to_string(&mut stderr).ok();
            }
            Err(format!("Python process failed: {}", stderr))
        }
    }
}
