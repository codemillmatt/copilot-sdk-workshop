use std::hash::{DefaultHasher, Hash, Hasher};
use std::io;
use std::path::{Component, Path, PathBuf};

#[derive(Debug)]
pub struct ArtifactState {
    path: PathBuf,
    fingerprint: Option<(u64, usize)>,
}

// These artifact helpers are for the optional HTML extension, not the core review.
pub fn capture_artifact_state(
    working_directory: impl AsRef<Path>,
    file_name: &str,
) -> io::Result<ArtifactState> {
    if file_name.is_empty()
        || Path::new(file_name).components().count() != 1
        || !matches!(
            Path::new(file_name).components().next(),
            Some(Component::Normal(_))
        )
    {
        return Err(io::Error::other(
            "Artifact name must be a single file name.",
        ));
    }
    let directory = working_directory.as_ref().canonicalize()?;
    if !directory.is_dir() {
        return Err(io::Error::other(
            "Artifact working directory is not a directory.",
        ));
    }
    let path = directory.join(file_name);
    let fingerprint = match std::fs::symlink_metadata(&path) {
        Ok(_) => Some(artifact_fingerprint(&path)?),
        Err(error) if error.kind() == io::ErrorKind::NotFound => None,
        Err(error) => return Err(error),
    };
    Ok(ArtifactState { path, fingerprint })
}

pub fn verify_artifact_update(state: &ArtifactState) -> io::Result<()> {
    let fingerprint = artifact_fingerprint(&state.path).map_err(|error| {
        io::Error::new(
            error.kind(),
            format!("No output update was verified. {error}"),
        )
    })?;
    if fingerprint.1 == 0 {
        return Err(io::Error::other(
            "No output update was verified. The output is empty.",
        ));
    }
    if state.fingerprint == Some(fingerprint) {
        return Err(io::Error::other("No output update was verified."));
    }
    Ok(())
}

fn artifact_fingerprint(path: &Path) -> io::Result<(u64, usize)> {
    let before = std::fs::symlink_metadata(path)?;
    if !before.is_file() || before.file_type().is_symlink() {
        return Err(io::Error::other(
            "Artifact must be a regular, nonsymlink file.",
        ));
    }
    let content = std::fs::read(path)?;
    let after = std::fs::symlink_metadata(path)?;
    if !after.is_file()
        || after.file_type().is_symlink()
        || before.len() != after.len()
        || before.modified()? != after.modified()?
    {
        return Err(io::Error::other("Artifact changed while being read."));
    }
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    Ok((hasher.finish(), content.len()))
}
