use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AgentRoleId {
    Architect,
    Frontend,
    Backend,
    Designer,
    Security,
    Database,
    DevOps,
    QA,
    PM,
    Writer,
    Principal,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentRole {
    pub id: AgentRoleId,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    pub tools: Vec<String>,
}

pub struct AgentRegistry {
    pub roles: Vec<AgentRole>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        Self {
            roles: vec![
                AgentRole {
                    id: AgentRoleId::Principal,
                    name: "Principal Engineer".to_string(),
                    description: "High-level technical review and production readiness.".to_string(),
                    system_prompt: "You are a Principal Engineer. You provide brutal technical criticism, ensure architectural integrity, and approve systems for production.".to_string(),
                    tools: vec!["code_analyzer".to_string(), "risk_auditor".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Architect,
                    name: "Software Architect".to_string(),
                    description: "Designs system structure and ensures technical alignment.".to_string(),
                    system_prompt: "You are a Software Architect. You design high-level systems, data models, and API interfaces.".to_string(),
                    tools: vec!["code_analyzer".to_string(), "graph_explorer".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::PM,
                    name: "Product Manager".to_string(),
                    description: "Requirements analysis and task prioritization.".to_string(),
                    system_prompt: "You are a Product Manager. You translate business goals into technical requirements and prioritize the engineering roadmap.".to_string(),
                    tools: vec!["search_engine".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Frontend,
                    name: "Frontend Engineer".to_string(),
                    description: "Expert in component architecture and UI performance.".to_string(),
                    system_prompt: "You are a Frontend Engineer. You build high-fidelity UI components, manage state, and ensure accessibility.".to_string(),
                    tools: vec!["file_writer".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Backend,
                    name: "Backend Engineer".to_string(),
                    description: "Expert in APIs, services, and distributed systems.".to_string(),
                    system_prompt: "You are a Backend Engineer. You design robust APIs, handle business logic, and integrate external services.".to_string(),
                    tools: vec!["file_writer".to_string(), "api_tester".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Security,
                    name: "Security Engineer".to_string(),
                    description: "Vulnerability analysis and authorization expert.".to_string(),
                    system_prompt: "You are a Security Engineer. You perform deep security audits, identify vulnerabilities, and ensure data protection.".to_string(),
                    tools: vec!["security_scanner".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::DevOps,
                    name: "DevOps Engineer".to_string(),
                    description: "Infrastructure, CI/CD, and deployment specialist.".to_string(),
                    system_prompt: "You are a DevOps Engineer. You automate deployments, manage CI/CD pipelines, and monitor system health.".to_string(),
                    tools: vec!["terminal_executor".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Database,
                    name: "Database Engineer".to_string(),
                    description: "Schema design, migrations, and query optimization.".to_string(),
                    system_prompt: "You are a Database Engineer. You design scalable schemas, manage migrations, and optimize data retrieval.".to_string(),
                    tools: vec!["db_analyzer".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Designer,
                    name: "UX Designer".to_string(),
                    description: "Interaction design and usability specialist.".to_string(),
                    system_prompt: "You are a UX Designer. You define user journeys, map interactions, and ensure intuitive product experiences.".to_string(),
                    tools: vec!["website_scraper".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::QA,
                    name: "QA Engineer".to_string(),
                    description: "Testing strategy and edge case identification.".to_string(),
                    system_prompt: "You are a QA Engineer. You identify edge cases, define testing strategies, and ensure overall software quality.".to_string(),
                    tools: vec!["test_runner".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Writer,
                    name: "Technical Writer".to_string(),
                    description: "Documentation and API guide specialist.".to_string(),
                    system_prompt: "You are a Technical Writer. You create clear, concise documentation and maintain the project's knowledge base.".to_string(),
                    tools: vec!["file_writer".to_string()],
                },
            ],
        }
    }
}
