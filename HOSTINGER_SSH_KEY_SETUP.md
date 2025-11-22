# Hostinger SSH Key Setup Guide

## 📍 Where to Add Your SSH Key in Hostinger

Your SSH public key should be added in **Hostinger hPanel** (Control Panel). Here's the exact location:

### Step 1: Log into Hostinger hPanel

1. Go to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Log in with your Hostinger account credentials

### Step 2: Navigate to SSH Access Section

**Path:** `Advanced` → `SSH Access` (or `SSH`)

Look for one of these menu options:
- **"Advanced"** → **"SSH Access"**
- **"Security"** → **"SSH Access"**
- **"SSH Keys"** (directly in the sidebar)

### Step 3: Add Your SSH Public Key

1. Click on **"SSH Access"** or **"SSH Keys"**
2. Look for **"Add SSH Key"** or **"Manage SSH Keys"** button
3. Click **"Add New SSH Key"** or similar option
4. You'll see a form with fields:
   - **Key Name** (optional): Give it a name like "My Laptop" or "Development Machine"
   - **Public Key**: Paste your entire SSH public key here

### Step 4: Paste Your SSH Key

Copy and paste this entire SSH key into the **"Public Key"** field:

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCcZWZzhS1OnZzrOfA2k1o/44P4kp5TUiYasagMEVoSvuk1vbhO4NVTNGpMWGO86Y0dVdQ7rMF3pOJPrV4P5SebHoUVPNpQZBURANBwHE66RcupGiysPyz+ELe8G8eTXv0IT+2FvtfoRXOPLfogZDdhPMglWOwJuFvwvxovTA6KVYdWOPgAgYIT5KCKj7wABoBjCfOG9d5Rmx88uSCRjzHt4Eti9I/F2CAE+u8Lj/kvoYJm+wNchxx8bzK/bvEDYdajpPPwMCMxJUR1oXVZ4HAxF3rB4RagNOHa4PWzMWNV7XiiUAEiqvLDiJZMp14AMFuYyR/gqKRocybVmHqyA8jwCKflAHbYGbcJNXaeyMyijdheNALM9IzEj7t/K3VNe7haluKiQCOxiPS9T+Z0fWmnnISmR+HQClo03QCvSw3ce8vL7PZ9yCwMD9zq+eVEebB7h9pRCT01K+ROoD5Z+JGR1Yz1ycDhb8UIUl0A6ws5y8VDyRpWlbbhJxVg1afZTNc= u302669616@my-kul-web2088.main-hosting.eu
```

**Important Notes:**
- Paste the **entire key** including `ssh-rsa` at the start
- Include the comment at the end (`u302669616@my-kul-web2088.main-hosting.eu`)
- Make sure there are **no line breaks** in the middle
- The key should be on **one single line**

### Step 5: Save the Key

1. Click **"Add Key"** or **"Save"** button
2. Wait for confirmation that the key was added successfully

---

## 🔐 Using SSH to Connect to Hostinger

After adding your SSH key, you can connect to your Hostinger server using SSH:

### Connection Details

**SSH Host:** `u302669616@my-kul-web2088.main-hosting.eu`  
**Port:** Usually `22` (default SSH port)

### Connect via SSH (Windows - PowerShell or CMD)

```powershell
ssh u302669616@my-kul-web2088.main-hosting.eu
```

Or if you need to specify a different port:

```powershell
ssh -p 22 u302669616@my-kul-web2088.main-hosting.eu
```

### Connect via SSH (Git Bash or WSL)

```bash
ssh u302669616@my-kul-web2088.main-hosting.eu
```

### If You Have a Private Key File

If your SSH private key is saved in a file (e.g., `id_rsa`):

```powershell
ssh -i C:\path\to\your\private_key u302669616@my-kul-web2088.main-hosting.eu
```

---

## 📤 Uploading Files via SSH (SCP)

Once SSH is set up, you can upload files to your Hostinger server:

### Upload Single File

```powershell
scp "C:\capstone2\capstone2\server\scripts\delete-all-chatrooms.sql" u302669616@my-kul-web2088.main-hosting.eu:/path/to/destination/
```

### Upload Entire Folder

```powershell
scp -r "C:\capstone2\capstone2\server" u302669616@my-kul-web2088.main-hosting.eu:/path/to/destination/
```

### Download File from Server

```powershell
scp u302669616@my-kul-web2088.main-hosting.eu:/path/to/file.sql "C:\local\destination\"
```

---

## 🌐 Alternative: Using FTP/SFTP

If SSH key setup is complicated, you can also use:

### Option 1: File Manager in hPanel
- Go to **"Files"** → **"File Manager"** in hPanel
- Upload files directly through the web interface

### Option 2: FTP Client (FileZilla, WinSCP, etc.)
- Use SFTP connection (secure FTP over SSH)
- **Host:** `my-kul-web2088.main-hosting.eu`
- **Username:** `u302669616`
- **Port:** `22` (for SFTP) or `21` (for FTP)
- **Protocol:** SFTP (if SSH keys are set up) or FTP

---

## ❓ Troubleshooting

### SSH Connection Fails

1. **Check if SSH access is enabled:**
   - Some Hostinger plans require enabling SSH access first
   - Look for "Enable SSH Access" option in hPanel

2. **Verify the SSH key:**
   - Make sure the public key was added correctly
   - No extra spaces or line breaks

3. **Check SSH port:**
   - Try different ports: `22`, `2222`, or check hPanel for the correct port

4. **Private key location:**
   - Windows: Usually in `C:\Users\YourUsername\.ssh\id_rsa`
   - Make sure your private key matches the public key you added

### Permission Denied Error

- Make sure your private key file has correct permissions
- Try specifying the private key explicitly: `ssh -i path/to/private_key user@host`

### Key Not Found

- Generate a new SSH key pair if needed
- Add the new public key to Hostinger
- Keep your private key secure (never share it!)

---

## 🔑 Generating SSH Keys (If You Don't Have One)

If you need to generate a new SSH key pair:

### Windows (PowerShell):

```powershell
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

This creates:
- Private key: `C:\Users\YourUsername\.ssh\id_rsa` (keep this secret!)
- Public key: `C:\Users\YourUsername\.ssh\id_rsa.pub` (add this to Hostinger)

### View Your Public Key:

```powershell
cat C:\Users\YourUsername\.ssh\id_rsa.pub
```

Copy the output and add it to Hostinger following Step 4 above.

---

## 📝 Quick Reference

**SSH Key Location in Hostinger hPanel:**
```
hPanel → Advanced → SSH Access → Add SSH Key
```

**SSH Connection Command:**
```powershell
ssh u302669616@my-kul-web2088.main-hosting.eu
```

**Upload Files via SCP:**
```powershell
scp "local_file.sql" u302669616@my-kul-web2088.main-hosting.eu:/remote/path/
```

---

**Need More Help?** Contact Hostinger support or check their documentation for SSH key management.











