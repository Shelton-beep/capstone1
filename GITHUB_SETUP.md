# GitHub Setup Guide

This guide will help you upload this project to GitHub.

## Pre-Upload Checklist

✅ **Completed:**
- [x] `.gitignore` files created (root, backend, frontend)
- [x] `.gitattributes` for Git LFS configured
- [x] `LICENSE` file added
- [x] `README.md` updated with comprehensive documentation
- [x] `SETUP.md` created for detailed setup instructions
- [x] `CONTRIBUTING.md` created for contribution guidelines
- [x] `.env.example` files created (backend, frontend)
- [x] GitHub issue templates created
- [x] CI workflow template created

## Important: Before Uploading

### 1. Verify .env Files Are Excluded

Check that `.env` files are NOT tracked:

```bash
# Check if .env is in gitignore
grep -r "\.env" .gitignore backend/.gitignore frontend/.gitignore

# Verify .env files exist but are ignored
ls -la backend/.env frontend/.env.local 2>/dev/null
```

### 2. Large Files Consideration

The repository contains large files:
- `backend/models/embeddings.npy` (~53MB)
- `backend/models/model.pkl` (~4.6MB)
- `backend/data/*.csv` (~40MB total)

**Options:**

**Option A: Use Git LFS (Recommended)**
```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.pkl"
git lfs track "*.npy"
git lfs track "backend/data/*.csv"
git lfs track "backend/models/*.csv"

# Add .gitattributes
git add .gitattributes
```

**Option B: Exclude Large Files**
Uncomment these lines in `.gitignore`:
```
backend/models/*.pkl
backend/models/*.npy
backend/models/*.csv
backend/data/*.csv
```

Then add a note in README that users need to train the model themselves.

**Option C: Host Separately**
- Upload models/data to cloud storage (Google Drive, AWS S3)
- Add download instructions in README

### 3. Remove Sensitive Data

```bash
# Verify no API keys in code
grep -r "sk-" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" .

# Verify .env is ignored
git check-ignore backend/.env
```

### 4. Clean Up Unnecessary Files

```bash
# Remove Python cache
find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null
find . -name "*.pyc" -delete

# Remove IDE files (if not in .gitignore)
rm -rf .vscode .idea 2>/dev/null
```

## Upload to GitHub

### Step 1: Initialize Git Repository

```bash
cd /Users/sheltonsimbi/projects/capstone1

# Initialize git
git init

# Add all files
git add .

# Verify what will be committed
git status

# Make initial commit
git commit -m "Initial commit: Legal Appeal Outcome Prediction System"
```

### Step 2: Create GitHub Repository

1. Go to GitHub.com
2. Click "New repository"
3. Name: `legal-appeal-prediction-system` (or your preferred name)
4. Description: "AI-powered system for predicting appeal case outcomes and generating legal briefs"
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

### Step 3: Connect and Push

```bash
# Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Verify Upload

1. Check GitHub repository page
2. Verify `.env` files are NOT visible
3. Verify large files are handled (LFS or excluded)
4. Check README displays correctly
5. Verify all documentation files are present

## Post-Upload Tasks

### 1. Add Repository Topics

On GitHub repository page, add topics:
- `legal-tech`
- `machine-learning`
- `nlp`
- `fastapi`
- `nextjs`
- `legal-ai`
- `appeal-prediction`

### 2. Update Repository Description

Use: "AI-powered system for predicting appeal case outcomes using LegalBERT and generating compelling legal briefs. Built with FastAPI, Next.js, and GPT-4o-mini."

### 3. Add Repository Badges (Optional)

Update README badges with your repository URL if desired.

### 4. Enable GitHub Actions

If using CI/CD, ensure GitHub Actions are enabled in repository settings.

## Security Checklist

- [ ] `.env` files are NOT in repository
- [ ] No API keys in code
- [ ] `.gitignore` properly configured
- [ ] Large files handled (LFS or excluded)
- [ ] No sensitive data in commits
- [ ] License file included
- [ ] Disclaimers in README

## Troubleshooting

### Large File Errors

If you get "file too large" errors:

```bash
# Use Git LFS
git lfs install
git lfs track "*.pkl"
git lfs track "*.npy"
git add .gitattributes
git add -f backend/models/*.pkl backend/models/*.npy
git commit -m "Add large files via Git LFS"
```

### .env File Accidentally Committed

```bash
# Remove from git but keep locally
git rm --cached backend/.env
git commit -m "Remove .env file from tracking"
git push
```

### Push Rejected

```bash
# If repository has different history
git pull origin main --allow-unrelated-histories
# Resolve conflicts if any
git push origin main
```

## Next Steps After Upload

1. **Add README badges** (if desired)
2. **Create releases** for major versions
3. **Set up GitHub Pages** (if hosting docs)
4. **Enable Discussions** (for Q&A)
5. **Add collaborators** (if working with others)

---

**Your repository is now ready for GitHub!** 🚀

