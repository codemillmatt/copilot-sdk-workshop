package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestArtifactUpdates(t *testing.T) {
	for _, mode := range []string{"missing", "empty", "new", "changed", "unchanged", "rewritten", "deleted", "directory", "symlink", "dangling", "unreadable", "other-file"} {
		t.Run(mode, func(t *testing.T) {
			directory := t.TempDir()
			path := filepath.Join(directory, "output.html")
			write := func(name, content string) {
				t.Helper()
				if err := os.WriteFile(name, []byte(content), 0600); err != nil {
					t.Fatal(err)
				}
			}
			if mode == "changed" || mode == "unchanged" || mode == "rewritten" || mode == "deleted" {
				write(path, "previous")
			}
			state, err := CaptureArtifactState(directory, "output.html")
			if err != nil {
				t.Fatal(err)
			}
			switch mode {
			case "empty":
				write(path, "")
			case "new", "changed":
				write(path, "updated")
			case "rewritten":
				write(path, "previous")
			case "deleted":
				if err := os.Remove(path); err != nil {
					t.Fatal(err)
				}
			case "directory":
				if err := os.Mkdir(path, 0700); err != nil {
					t.Fatal(err)
				}
			case "symlink", "dangling":
				target := filepath.Join(directory, "target.html")
				if mode == "symlink" {
					write(target, "prior artifact")
				}
				if err := os.Symlink(target, path); err != nil {
					t.Fatal(err)
				}
			case "unreadable":
				if os.Geteuid() == 0 {
					t.Skip("root bypasses file read permissions")
				}
				write(path, "private")
				if err := os.Chmod(path, 0); err != nil {
					t.Fatal(err)
				}
				t.Cleanup(func() {
					if err := os.Chmod(path, 0600); err != nil {
						t.Error(err)
					}
				})
			case "other-file":
				write(filepath.Join(directory, "different.html"), "updated")
			}
			err = VerifyArtifactUpdate(state)
			if mode == "new" || mode == "changed" {
				if err != nil {
					t.Fatal(err)
				}
			} else if err == nil || !strings.Contains(err.Error(), "No output update was verified.") {
				t.Fatalf("wanted explicit non-success, got %v", err)
			}
			if mode == "unchanged" || mode == "rewritten" {
				if err.Error() != "No output update was verified." {
					t.Fatal(err)
				}
				content, err := os.ReadFile(path)
				if err != nil || string(content) != "previous" {
					t.Fatalf("prior content was not preserved: %q, %v", content, err)
				}
			}
			if mode == "directory" || mode == "symlink" || mode == "dangling" || mode == "unreadable" {
				if _, err := CaptureArtifactState(directory, "output.html"); err == nil {
					t.Fatal("capture accepted an invalid prior artifact")
				}
			}
		})
	}
}

func TestArtifactCaptureErrorsAndEmptyPrior(t *testing.T) {
	directory := t.TempDir()
	for _, name := range []string{"", ".", "..", "../elsewhere", "child/output.html", filepath.Join(directory, "absolute.html")} {
		if _, err := CaptureArtifactState(directory, name); err == nil {
			t.Fatalf("accepted invalid file name %q", name)
		}
	}
	if _, err := CaptureArtifactState(filepath.Join(directory, "missing"), "out.html"); err == nil {
		t.Fatal("accepted missing working directory")
	}
	path := filepath.Join(directory, "out.html")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	state, err := CaptureArtifactState(directory, "out.html")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("new content"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := VerifyArtifactUpdate(state); err != nil {
		t.Fatal(err)
	}
	if _, err := CaptureArtifactState(path, "out.html"); err == nil {
		t.Fatal("accepted a file as working directory")
	}
}
