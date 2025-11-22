# Team Repository Setup Guide

## 🚨 **Important: Repository Ownership**

When you clone someone else's GitHub repository, your pushes will appear in **their repository**, not yours. This guide shows you how to set up your own repository.

## 🎯 **Why This Happens**

```
Your Computer → Cloned Repository → Their GitHub Repository
     ↓                ↓                      ↓
   Your Code    →  Your Changes    →  Their Repository
```

**Result:** Your teammates see your pushes in their repository!

## ✅ **Solution: Create Your Own Repository**

### **Method 1: Quick Setup (Recommended)**

1. **Run the setup script:**
   ```bash
   # Windows Batch
   setup-your-repo.bat
   
   # PowerShell (Advanced)
   powershell -ExecutionPolicy Bypass -File setup-your-repo.ps1
   ```

2. **Follow the prompts** to create your own repository

### **Method 2: Manual Setup**

#### **Step 1: Create Your GitHub Repository**

1. Go to [GitHub.com](https://github.com)
2. Click the **"+"** icon → **"New repository"**
3. **Name it:** `capstone2-yourname` (or any name you prefer)
4. **Make it Public** or Private (your choice)
5. **⚠️ IMPORTANT:** Do NOT initialize with README, .gitignore, or license
6. Click **"Create repository"**

#### **Step 2: Change Your Remote Origin**

```bash
# Replace with your actual repository URL
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify the change
git remote -v
```

#### **Step 3: Push to Your Repository**

```bash
git push -u origin main
```

## 🔄 **Team Collaboration Options**

### **Option A: Individual Repositories (Recommended)**
- Each team member has their own repository
- Use auto-sync tools to stay updated
- No conflicts between team members
- Easy to manage individual contributions

### **Option B: Shared Repository**
- One repository for the whole team
- All team members push to the same repository
- Requires coordination to avoid conflicts
- Use branches for different features

## 🛠️ **Auto-Sync Setup**

After setting up your own repository, use the auto-sync tools:

1. **Run setup script:**
   ```bash
   setup-team-sync.bat
   ```

2. **Daily sync:**
   ```bash
   team-auto-sync.bat
   ```

## 📋 **Repository URLs**

After setup, your repository structure will be:

```
Your Repository: https://github.com/YOUR_USERNAME/capstone2-yourname
Team Member 1:  https://github.com/TEAMMATE1/capstone2-teammate1
Team Member 2:  https://github.com/TEAMMATE2/capstone2-teammate2
```

## 🔧 **Troubleshooting**

### **Error: Repository not found**
- Check your repository URL
- Make sure the repository exists on GitHub
- Verify you have access to the repository

### **Error: Authentication failed**
- Make sure you're logged into GitHub
- Check your GitHub credentials
- Use GitHub CLI or personal access token if needed

### **Error: Push rejected**
- The repository might have existing content
- Make sure you didn't initialize with README
- Try force push (be careful!): `git push -f origin main`

## 📞 **Need Help?**

1. **Check the console output** for detailed error messages
2. **Verify your GitHub repository** exists and is accessible
3. **Make sure you're logged in** to GitHub
4. **Contact your team lead** if you need assistance

## 🎉 **Success Indicators**

You'll know it worked when:
- ✅ Your code appears in your own GitHub repository
- ✅ Your teammates don't see your pushes in their repository
- ✅ You can push and pull without issues
- ✅ Auto-sync tools work correctly

---

**Generated on:** $(Get-Date)
**For:** Capstone Project Team
