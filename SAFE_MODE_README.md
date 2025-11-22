# Repository Safe Mode 🔒

## Current Status: SAFE MODE ENABLED ✅

Your repository is now in **SAFE MODE**, which prevents accidental pushes to the main GitHub repository while still allowing you to pull updates.

## What Safe Mode Does

Safe Mode implements multiple layers of protection:

1. **Push URL Disabled**: The push URL for origin is set to `no_push`
2. **Branch Protection**: Main branch is configured to prevent pushes
3. **Push Default**: Set to `nothing` to prevent accidental pushes
4. **Pre-push Hook**: Additional safety hook that blocks pushes

## What You CAN Still Do

✅ **Pull/Fetch**: You can still pull updates from the remote repository
✅ **Commit**: You can commit changes locally
✅ **Branch**: You can create and work on local branches
✅ **View Remote**: You can view remote branches and changes

## What You CANNOT Do

❌ **Push**: Cannot push to the remote repository
❌ **Sync**: Automatic sync to remote is disabled

## Verify Safe Mode Status

Check if safe mode is active:
```bash
git remote -v
```

You should see:
```
origin  https://github.com/mjpogi01/capstone2 (fetch)
origin  no_push (push)
```

## Disable Safe Mode (Re-enable Pushing)

If you need to re-enable pushing, run these commands:

```bash
# Remove push URL restriction
git config --local --unset remote.origin.pushurl

# Remove branch push restriction
git config --local --unset branch.main.pushremote

# Reset push default to simple (or your preferred setting)
git config --local push.default simple
```

Or use this all-in-one command:
```bash
git remote set-url --push origin https://github.com/mjpogi01/capstone2
```

## Re-enable Safe Mode

To re-enable safe mode at any time:

```bash
git remote set-url --push origin no_push
git config --local branch.main.pushRemote no_push
git config --local push.default nothing
```

Or run the quick setup script:
```bash
setup-safe-mode.bat
```

## Working with Safe Mode

### Recommended Workflow

1. **Pull updates regularly**:
   ```bash
   git pull origin main
   ```

2. **Work locally**:
   - Make your changes
   - Commit locally
   - Test thoroughly

3. **If you need to push**: Temporarily disable safe mode, push your changes, then re-enable it

### Create a Separate Remote for Your Fork

If you want to push to your own fork:

```bash
# Add your fork as a separate remote
git remote add myfork https://github.com/YOUR_USERNAME/capstone2

# Push to your fork (safe mode doesn't affect this)
git push myfork main
```

## Troubleshooting

### "Cannot push" error
This is expected! Safe mode is working correctly. If you need to push, disable safe mode first.

### Still able to push?
Check your configuration:
```bash
git config --local --list | findstr push
```

Re-run the safe mode setup if needed.

### Git hooks not working on Windows
Git hooks may require Git Bash or WSL on Windows. The push URL restriction is the primary protection.

## Additional Security

The following auto-sync scripts have been disabled:
- DISABLED-auto-sync.bat
- DISABLED-auto-sync.ps1
- DISABLED-team-auto-sync.bat
- DISABLED-team-auto-sync.ps1

This prevents any automated pushes from occurring.

## Questions?

If you have questions about safe mode or need to modify this setup, refer to this document or check your Git configuration with:

```bash
git config --local --list
```

---

**Created**: October 22, 2025  
**Repository**: capstone2  
**Purpose**: Protect against accidental pushes to the main repository

