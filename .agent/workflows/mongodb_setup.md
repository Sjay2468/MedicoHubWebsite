---
description: How to set up MongoDB Atlas and get a connection string
---

1. **Enter Your Project**:
   - On the screen you shared, click on the name **"Project 0"** (the blue link).

2. **Create a Database Cluster**:
   - Inside the project, you will likely see a big green button saying **"Create"** or **"Build a Database"**. Click it.
   - Select the **M0 Free** tier (the free option on the far right or left depending on layout).
   - Choose a provider (AWS is fine) and a region close to you (e.g., Frankfurt or London).
   - Click **"Create Deployment"** or **"Create Cluster"**.

3. **Set Up Security (Crucial)**:
   - You will see a "Security Quickstart" popup.
   - **Username & Password**: Create a user (e.g., username: `admin`, password: `yourSecurePassword123`). **Write these down**, you will need them.
   - **IP Access**: Select **"Allow Access from Anywhere"** (or add `0.0.0.0/0`) because your Render backend will have a dynamic IP address.
   - Click **"Finish and Close"**.

4. **Get the Connection String**:
   - You will now be on the "Database Deployments" dashboard.
   - Click the **"Connect"** button next to your Cluster name.
   - detailed_step: Select **"Drivers"** (Node.js).
   - You will see a string like: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`.
   - **Copy this string.**

5. **Final Step**:
   - Paste that string here in the chat.
   - Replace `<password>` with the actual password you created in step 3.
