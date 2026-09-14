# Rossomandi Auto Srl — Mobile & Web Application

Official mobile and web application for **Rossomandi Auto Srl** dealership. The platform integrates real-time used vehicle catalog browsing, dealership appointment management, internal office messaging, and automated synchronization with local MS Access dealership databases via cloud-hosted Supabase PostgreSQL.

---

## 🚗 Core Features

### 1. Public Guest Catalog (`Stock Usato`)
- **No Login Required**: Anyone can click **"🚗 Sfoglia Catalogo Auto (Ospite)"** on the login screen to browse available used vehicles.
- **Vehicle Information**: Displays index (`#`), brand (`Marca`), version (`Versione`), and ready status badge (`✅ Pronta`).
- **Vehicle Filtering**: Filter inventory by fuel type (*Benzina*, *Diesel*) or search by brand and model.

### 2. Dealership Staff Access (Sellers & Admins)
- **Secure Authentication**: Authorized staff log in using official credentials (`admin@rossomandi.com`, `lorenzo@rossomandi.com`, or seller accounts).
- **Live Customer Appointments**: Real-time view of customer appointments synced directly from the dealership MS Access database.
- **Full Inventory & Pricing**: Staff can view complete vehicle stock details, including AutoScout, estimated, and selling prices.
- **Office Chat**: Built-in team messaging system for internal dealership communication.
- **Automatic Seller Code Assignment**: Automatically maps seller accounts to their respective seller codes (`SC`, `GC`, `MR`, `AP`, `IS`, etc.).

---

## 🛠️ Project Structure

```
Mobile-Application/
├── backend/                  # Node.js + Express API Backend & Sync Service
│   ├── server.js             # Express API Server & authentication handlers
│   ├── db.js                 # PostgreSQL connection pool (Supabase)
│   ├── sync.py               # MS Access to PostgreSQL synchronization script
│   ├── run_sync_hidden.vbs   # Windows background VBScript launcher for sync
│   ├── start_sync.bat        # Batch file wrapper for sync.py
│   └── package.json          # Backend dependencies
│
└── mobile/                   # React Native (Expo) Cross-Platform Application
    ├── App.js                # React Navigation setup & app entry point
    ├── app.json              # Expo configuration (App Store & Play Store metadata)
    ├── eas.json              # Expo Application Services build profiles
    ├── config/
    │   └── apiConfig.js      # API base URL configuration
    └── screens/              # UI Screen Components
        ├── LoginScreen.js       # Login & Guest entry screen
        ├── SignupScreen.js      # User registration screen
        ├── StockUsatoScreen.js  # Vehicle stock catalog screen
        ├── AppointmentsScreen.js# Appointments management screen
        ├── OfficeChatScreen.js  # Internal staff messaging screen
        ├── AdminDashboard.js    # Admin control panel
        └── SellerDashboard.js   # Seller control panel
```

---

## 🚀 Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python 3](https://www.python.org/) (for MS Access database sync on Windows)
- [Expo CLI](https://docs.expo.dev/) (`npm install -g expo-cli`)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/junaid0000/Mobile-Application.git
cd Mobile-Application
```

---

### Step 2: Configure & Start Backend Server

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   npm install
   ```

2. Create a file named **`.env`** in the `backend/` directory with the following content:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres.ngvcirlrsgqrzhgawubu:Rossomandi2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
   JWT_SECRET=supersecret_rossomandi_jwt_key
   ```

3. Start the backend server:
   ```bash
   npm start
   ```
   *The server will run on `http://localhost:5000` connected to Supabase PostgreSQL.*

---

### Step 3: Run Mobile & Web Application

1. Open a new terminal and navigate to the `mobile/` directory:
   ```bash
   cd mobile
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Choose your platform:
   - Press **`w`** to launch the web version in your browser (`http://localhost:8081`).
   - Scan the displayed QR code using the **Expo Go** app on iOS or Android.

---

### Step 4: Run MS Access Database Sync (Dealership PC)

On the dealership computer running Microsoft Access:
1. Double-click `backend/run_sync_hidden.vbs` to start background sync silently.
2. Alternatively, run:
   ```bash
   cd backend
   python sync.py
   ```

---

## 🔐 Credentials & Default Accounts

- **Main Admin**: `admin@rossomandi.com` (Password: `User0001` or `admin123`)
- **Secondary Admin**: `lorenzo@rossomandi.com` (Password: `User0001` or `admin123`)

---

## 📱 Mobile App Releases

- **iOS App Store**: Version `1.0.8 (37)` — Available on Apple App Store (*ID: 6805829959*).
- **Google Play Console**: Version `1.0.8 (37)` — Production submission ready.
