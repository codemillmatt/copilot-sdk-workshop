package main

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type ArtifactState struct {
	path        string
	existed     bool
	fingerprint [sha256.Size]byte
}

// These artifact helpers are for the optional HTML extension, not the core review.
func CaptureArtifactState(workingDirectory, fileName string) (ArtifactState, error) {
	if fileName == "" || fileName == "." || fileName == ".." || filepath.Base(fileName) != fileName {
		return ArtifactState{}, fmt.Errorf("Artifact name must be a single file name.")
	}
	directory, err := filepath.Abs(workingDirectory)
	if err != nil {
		return ArtifactState{}, err
	}
	info, err := os.Stat(directory)
	if err != nil {
		return ArtifactState{}, err
	}
	if !info.IsDir() {
		return ArtifactState{}, fmt.Errorf("Artifact working directory is not a directory.")
	}
	state := ArtifactState{path: filepath.Join(directory, fileName)}
	if _, err := os.Lstat(state.path); err != nil {
		if os.IsNotExist(err) {
			return state, nil
		}
		return ArtifactState{}, err
	}
	content, err := readArtifact(state.path)
	if err != nil {
		return ArtifactState{}, err
	}
	state.existed = true
	state.fingerprint = sha256.Sum256(content)
	return state, nil
}

func VerifyArtifactUpdate(state ArtifactState) error {
	content, err := readArtifact(state.path)
	if err != nil {
		return fmt.Errorf("No output update was verified. %w", err)
	}
	if len(content) == 0 {
		return fmt.Errorf("No output update was verified. The output is empty.")
	}
	if state.existed && sha256.Sum256(content) == state.fingerprint {
		return fmt.Errorf("No output update was verified.")
	}
	return nil
}

func readArtifact(path string) ([]byte, error) {
	before, err := os.Lstat(path)
	if err != nil {
		return nil, err
	}
	if !before.Mode().IsRegular() {
		return nil, fmt.Errorf("Artifact %s must be a regular, nonsymlink file.", path)
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	content, readErr := io.ReadAll(file)
	closeErr := file.Close()
	if readErr != nil {
		return nil, readErr
	}
	if closeErr != nil {
		return nil, closeErr
	}
	after, err := os.Lstat(path)
	if err != nil {
		return nil, err
	}
	if !after.Mode().IsRegular() || !os.SameFile(before, after) || before.Size() != after.Size() || !before.ModTime().Equal(after.ModTime()) {
		return nil, fmt.Errorf("Artifact %s changed while being read.", path)
	}
	return content, nil
}
