package main

import "fmt"

// Step 1 replaces main with a zero-tools session: AvailableTools: []string{} and
// an OnPermissionRequest callback returning &rpc.PermissionDecisionReject{}.
// Disconnect the session and stop the client on success and failure.
// The optional HTML artifact helpers remain in artifact.go.

func main() {
	fmt.Println("The Copilot SDK workshop starter is ready.")
	fmt.Println("Continue with Step 1 to create your first Copilot session.")
}
