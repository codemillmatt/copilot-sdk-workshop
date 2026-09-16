// Step 1 replaces main with a zero-tools session: available_tools = Some(vec![])
// and with_permission_handler(github_copilot_sdk::permission::deny_all()).
// Disconnect the session and stop the client on success and failure.
// The optional HTML lesson adds `mod artifact;` to use src/artifact.rs.

fn main() {
    println!("The Copilot SDK workshop starter is ready.");
    println!("Continue with Step 1 to create your first Copilot session.");
}
