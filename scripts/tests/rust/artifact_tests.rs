use super::{capture_artifact_state, verify_artifact_update};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

struct FixtureDirectory(PathBuf);

impl FixtureDirectory {
    fn new() -> Self {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let directory = std::env::temp_dir().join(format!(
            "workshop-artifact-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&directory).unwrap();
        Self(directory)
    }
}

impl Drop for FixtureDirectory {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).expect("clean up this test's artifact fixture");
    }
}

#[test]
fn exact_artifact_updates() {
    for mode in [
        "missing",
        "empty",
        "new",
        "changed",
        "unchanged",
        "rewritten",
        "deleted",
        "directory",
        "other-file",
    ] {
        let directory = FixtureDirectory::new();
        let path = directory.0.join("output.html");
        if matches!(mode, "changed" | "unchanged" | "rewritten" | "deleted") {
            fs::write(&path, "previous").unwrap();
        }
        let state = capture_artifact_state(&directory.0, "output.html").unwrap();
        match mode {
            "empty" => fs::write(&path, "").unwrap(),
            "new" | "changed" => fs::write(&path, "updated").unwrap(),
            "rewritten" => fs::write(&path, "previous").unwrap(),
            "deleted" => fs::remove_file(&path).unwrap(),
            "directory" => fs::create_dir(&path).unwrap(),
            "other-file" => fs::write(directory.0.join("different.html"), "updated").unwrap(),
            _ => {}
        }
        let result = verify_artifact_update(&state);
        if matches!(mode, "new" | "changed") {
            result.unwrap();
        } else {
            let message = result.unwrap_err().to_string();
            assert!(
                message.contains("No output update was verified."),
                "{mode}: {message}"
            );
            if matches!(mode, "unchanged" | "rewritten") {
                assert_eq!(message, "No output update was verified.");
                assert_eq!(fs::read_to_string(&path).unwrap(), "previous");
            }
        }
        if mode == "directory" {
            assert!(capture_artifact_state(&directory.0, "output.html").is_err());
        }
    }
}

#[test]
fn capture_errors_and_empty_prior() {
    let directory = FixtureDirectory::new();
    for name in [
        "",
        ".",
        "..",
        "../outside",
        "child/output.html",
        "/absolute.html",
    ] {
        assert!(
            capture_artifact_state(&directory.0, name).is_err(),
            "{name}"
        );
    }
    assert!(capture_artifact_state(directory.0.join("missing"), "output.html").is_err());
    let path = directory.0.join("output.html");
    fs::write(&path, "").unwrap();
    let state = capture_artifact_state(&directory.0, "output.html").unwrap();
    fs::write(&path, "updated").unwrap();
    verify_artifact_update(&state).unwrap();
    assert!(capture_artifact_state(&path, "output.html").is_err());
}

#[cfg(unix)]
#[test]
fn symlinks_and_read_errors_are_not_updates() {
    use std::os::unix::fs::{PermissionsExt, symlink};
    for mode in ["symlink", "dangling", "unreadable"] {
        let directory = FixtureDirectory::new();
        let path = directory.0.join("output.html");
        let state = capture_artifact_state(&directory.0, "output.html").unwrap();
        if mode == "unreadable" {
            fs::write(&path, "private").unwrap();
            fs::set_permissions(&path, fs::Permissions::from_mode(0)).unwrap();
            let read_result = fs::read(&path);
            let capture_result = capture_artifact_state(&directory.0, "output.html");
            let verify_result = verify_artifact_update(&state);
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
            if read_result.is_ok() {
                eprintln!("Read-permission fixture skipped: this user can read mode-000 files.");
                continue;
            }
            assert!(capture_result.is_err());
            assert!(verify_result.is_err());
        } else {
            let target = directory.0.join("prior.html");
            if mode == "symlink" {
                fs::write(&target, "prior artifact").unwrap();
            }
            symlink(&target, &path).unwrap();
            assert!(capture_artifact_state(&directory.0, "output.html").is_err());
            assert!(verify_artifact_update(&state).is_err());
            if mode == "symlink" {
                assert_eq!(fs::read_to_string(target).unwrap(), "prior artifact");
            }
        }
    }
}
