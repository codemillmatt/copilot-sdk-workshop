use super::*;

#[tokio::test]
async fn generation_and_html_profiles() {
    let config = generation_config(&["approved fact".to_owned()]).unwrap();
    assert_eq!(
        config.available_tools.as_deref(),
        Some(&[APPROVED_FACT_LOOKUP_NAME.to_owned()][..])
    );
    assert!(config.mcp_servers.is_none());
    let tools = config.tools.unwrap();
    assert_eq!(tools.len(), 1);
    assert!(tools[0].skip_permission);
    let handler = config.permission_handler.unwrap();
    let result = handler
        .handle(
            github_copilot_sdk::types::SessionId::new("fixture"),
            github_copilot_sdk::types::RequestId::new("fixture"),
            github_copilot_sdk::types::PermissionRequestData::default(),
        )
        .await;
    let github_copilot_sdk::handler::PermissionResult::Decision { decision, .. } = result else {
        panic!("missing denial");
    };
    assert_eq!(serde_json::to_value(decision).unwrap()["kind"], "reject");
    let directory = std::env::current_dir().unwrap();
    assert_eq!(
        html_config(directory.clone()).working_directory,
        Some(directory)
    );
}
