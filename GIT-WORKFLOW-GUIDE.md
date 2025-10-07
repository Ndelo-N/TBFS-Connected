# 🎓 Complete Guide to Creating and Testing Features on GitHub

A comprehensive guide for managing feature development with Git and GitHub.

---

## 📋 **The Feature Development Workflow**

### **Step 1: Start with a Clean Main Branch**

```cmd
# Navigate to your repository
E:
cd "My Drive\TBFS SYSTEM\TBFS-Connected"

# Make sure you're on main and it's up to date
git checkout main
git pull origin main
```

---

### **Step 2: Create a New Feature Branch**

**Always create a branch for new work!** Never work directly on `main`.

```cmd
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/add-dark-mode
git checkout -b fix/calculation-bug
git checkout -b update/improve-ui
```

**Branch Naming Convention:**
- `feature/` - for new features
- `fix/` - for bug fixes
- `update/` - for improvements/updates
- `hotfix/` - for urgent production fixes

---

### **Step 3: Make Your Changes**

1. Edit your files as needed
2. Test locally by opening `index.html` in your browser
3. Make sure everything works!

---

### **Step 4: Commit Your Changes**

```cmd
# See what files changed
git status

# Add files to staging
git add .
# OR add specific files:
git add index.html sw.js

# Commit with a descriptive message
git commit -m "feat: Add dark mode toggle to settings"

# More commit examples:
git commit -m "fix: Resolve loan calculation error"
git commit -m "update: Improve dashboard layout"
```

**Good Commit Messages:**
- ✅ `fix: Resolve duplicate variable error`
- ✅ `feat: Add export to Excel functionality`
- ✅ `update: Change interest rate from 30% to 15%`
- ❌ `fixed stuff`
- ❌ `changes`
- ❌ `update`

---

### **Step 5: Push Your Feature Branch to GitHub**

```cmd
# Push your branch to GitHub
git push origin feature/your-feature-name

# Example:
git push origin feature/add-dark-mode
```

---

## 🧪 **Testing Your Feature Branch**

### **Method 1: Test Locally (Recommended)**

**Using Python (if you have it installed):**
```cmd
# Start a local web server
python -m http.server 8000
# OR
python3 -m http.server 8000

# Then open in browser:
# http://localhost:8000
```

**Using Node.js (if you have it):**
```cmd
# Install live-server globally (one time)
npm install -g live-server

# Start server
live-server
```

**Using VS Code:**
- Install the "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

---

### **Method 2: Test on GitHub Pages**

**Option A: Temporarily Deploy Feature Branch**
1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Source", change branch from `main` to your feature branch
4. Save and wait 2-5 minutes
5. Visit your GitHub Pages URL

**Option B: Use GitHub Codespaces (if available)**
- Open your repository on GitHub
- Click the green **Code** button → **Codespaces** → **Create codespace**
- Test in the cloud environment

---

### **Method 3: View Code on GitHub**

You can always view your changes:
1. Go to your repository on GitHub
2. Click the branch dropdown (says "main" by default)
3. Select your feature branch
4. Browse the files to see your changes

---

## ✅ **Merging Your Feature When It's Ready**

### **Option 1: Merge Locally (Fast & Simple)**

```cmd
# Switch back to main
git checkout main

# Make sure main is up to date
git pull origin main

# Merge your feature
git merge feature/your-feature-name

# Push to GitHub
git push origin main
```

---

### **Option 2: Create a Pull Request (Professional Way)**

**Why use Pull Requests?**
- 📝 Document what changed and why
- 👀 Review code before merging
- 💬 Discuss changes with team members
- 📊 See all changes in one view

**Steps:**
1. Push your feature branch: `git push origin feature/your-feature-name`
2. Go to your repository on GitHub
3. Click **"Compare & pull request"** (appears automatically)
4. Add a title and description
5. Click **"Create pull request"**
6. Review the changes
7. Click **"Merge pull request"** when ready
8. Delete the feature branch (optional but recommended)

**Then on your local machine:**
```cmd
# Update your local main branch
git checkout main
git pull origin main

# Optional: Delete the old feature branch
git branch -d feature/your-feature-name
```

---

## 🔄 **Complete Example Workflow**

Let's say you want to add a new export feature:

```cmd
# 1. Start fresh
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/add-excel-export

# 3. Make your changes
# Edit files, add export functionality...

# 4. Test locally
start index.html
# Test everything works!

# 5. Commit changes
git add .
git commit -m "feat: Add Excel export for loan reports"

# 6. Push to GitHub
git push origin feature/add-excel-export

# 7. Test the pushed version
# Go to GitHub → Settings → Pages → Change branch to feature/add-excel-export
# OR test locally again

# 8. Merge when satisfied
git checkout main
git merge feature/add-excel-export
git push origin main

# 9. Clean up
git branch -d feature/add-excel-export
```

---

## 🎯 **Best Practices**

### **DO:**
✅ Always work on feature branches, never directly on `main`  
✅ Use descriptive branch names  
✅ Write clear commit messages  
✅ Test before merging  
✅ Keep commits focused (one feature/fix per commit)  
✅ Pull main before creating new branches  
✅ Delete old branches after merging  

### **DON'T:**
❌ Work directly on the `main` branch  
❌ Commit without testing  
❌ Use vague commit messages like "update" or "fix"  
❌ Mix multiple unrelated changes in one commit  
❌ Forget to pull before creating new branches  

---

## 🚨 **Common Issues & Solutions**

### **"I'm on the wrong branch!"**
```cmd
# See current branch
git branch

# Switch to correct branch
git checkout correct-branch-name
```

### **"I made changes on main by mistake!"**
```cmd
# Create a new branch with your changes
git checkout -b feature/my-changes

# Your changes are now on the new branch!
# Switch back to main and reset it
git checkout main
git reset --hard origin/main
```

### **"How do I see my changes before committing?"**
```cmd
# See which files changed
git status

# See actual changes
git diff

# See changes for specific file
git diff index.html
```

### **"I want to undo my last commit"**
```cmd
# Keep changes but undo commit
git reset --soft HEAD~1

# Undo commit AND discard changes (careful!)
git reset --hard HEAD~1
```

### **"My local repository is out of sync!"**
```cmd
# Get latest changes from GitHub
git fetch origin

# See what branches exist
git branch -a

# Reset your local main to match GitHub
git checkout main
git reset --hard origin/main
```

### **"I have merge conflicts!"**
```cmd
# When you get a conflict during merge:
# 1. Open the conflicted files
# 2. Look for markers like <<<<<<< HEAD
# 3. Edit to resolve conflicts
# 4. Remove the conflict markers
# 5. Save the file
# 6. Add and commit:
git add .
git commit -m "fix: Resolve merge conflicts"
```

---

## 📚 **Quick Reference Cheat Sheet**

```cmd
# BRANCH MANAGEMENT
git branch                          # List branches
git branch -a                       # List all branches (including remote)
git checkout -b new-branch          # Create and switch to new branch
git checkout branch-name            # Switch to existing branch
git branch -d branch-name           # Delete branch (safe)
git branch -D branch-name           # Force delete branch

# MAKING CHANGES
git status                          # See what changed
git add .                           # Stage all changes
git add file.html                   # Stage specific file
git commit -m "message"             # Commit changes
git commit -am "message"            # Add and commit (tracked files only)

# SYNCING WITH GITHUB
git pull origin main                # Get latest from GitHub
git push origin branch-name         # Push your branch to GitHub
git fetch origin                    # Download changes without merging

# MERGING
git checkout main                   # Switch to main
git merge feature-branch            # Merge feature into main
git push origin main                # Push merged changes

# VIEWING HISTORY
git log                             # View commit history
git log --oneline                   # Compact history
git log --oneline -5                # Last 5 commits
git diff                            # See unstaged changes
git diff --staged                   # See staged changes

# UNDOING CHANGES
git checkout -- file.html           # Discard changes to file
git reset HEAD file.html            # Unstage file
git reset --soft HEAD~1             # Undo last commit, keep changes
git reset --hard HEAD~1             # Undo last commit, discard changes

# STASHING (temporarily save work)
git stash                           # Save current work
git stash list                      # View stashed work
git stash pop                       # Apply and remove latest stash
git stash apply                     # Apply stash without removing
```

---

## 🎓 **Practice Exercise**

Try this simple workflow right now:

```cmd
# 1. Create a test branch
git checkout -b test/my-first-feature

# 2. Make a small change (add a comment to index.html)
# Open index.html and add: <!-- Testing feature branches -->

# 3. Commit it
git add index.html
git commit -m "test: Add comment to practice git workflow"

# 4. Push it
git push origin test/my-first-feature

# 5. Go back to main
git checkout main

# 6. Merge it
git merge test/my-first-feature

# 7. Push to GitHub
git push origin main

# 8. Clean up
git branch -d test/my-first-feature
```

---

## 🔧 **Advanced Tips**

### **Working with Multiple Features**

```cmd
# You can have multiple feature branches at once
git checkout -b feature/dark-mode
# Work on dark mode...
git add .
git commit -m "feat: Add dark mode"

# Switch to work on something else
git checkout -b feature/export-excel
# Work on Excel export...
git add .
git commit -m "feat: Add Excel export"

# Switch between them anytime
git checkout feature/dark-mode
git checkout feature/export-excel
git checkout main
```

### **Keeping Feature Branch Updated with Main**

If main gets updated while you're working on a feature:

```cmd
# From your feature branch
git checkout feature/my-feature

# Get latest main and merge it
git fetch origin
git merge origin/main

# Or use rebase (cleaner history)
git rebase origin/main
```

### **Cherry-Pick (Apply specific commits)**

```cmd
# Apply a specific commit from another branch
git cherry-pick commit-hash

# Example:
git cherry-pick 3b5e82c
```

### **Rename a Branch**

```cmd
# Rename current branch
git branch -m new-name

# Rename any branch
git branch -m old-name new-name
```

---

## 📖 **Git Terminology**

- **Repository (Repo)**: Your project folder with Git tracking
- **Branch**: An independent line of development
- **Commit**: A snapshot of your changes
- **Staging Area**: Files ready to be committed
- **Remote**: The GitHub version of your repository
- **Origin**: The default name for your remote repository
- **HEAD**: Pointer to your current branch/commit
- **Merge**: Combine changes from one branch into another
- **Pull**: Download and merge changes from GitHub
- **Push**: Upload your commits to GitHub
- **Clone**: Download a repository from GitHub
- **Fork**: Your own copy of someone else's repository

---

## 🎯 **Workflow Summary**

**Daily Development Cycle:**
1. `git checkout main` - Start from main
2. `git pull origin main` - Get latest changes
3. `git checkout -b feature/new-feature` - Create feature branch
4. Make changes and test
5. `git add .` - Stage changes
6. `git commit -m "feat: Description"` - Commit
7. `git push origin feature/new-feature` - Push to GitHub
8. Test the feature
9. `git checkout main` - Switch to main
10. `git merge feature/new-feature` - Merge
11. `git push origin main` - Push to GitHub
12. `git branch -d feature/new-feature` - Clean up

---

## 📞 **Getting Help**

```cmd
# Get help for any command
git help
git help commit
git help branch

# Quick command reference
git command --help
```

---

## 🌟 **Resources**

- **Official Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Interactive Git Tutorial**: https://learngitbranching.js.org/
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf

---

**Created for: Thaba Bosiu Financial Services**  
**Date: October 2025**  
**Version: 1.0**

---

*Remember: When in doubt, create a branch! It's always safer to experiment on a branch than to work directly on main.* 🚀