import subprocess

try:
    subprocess.run(["git", "add", "backend/server.js", "backend/vercel.json", "mobile/"], check=True)
    subprocess.run(["git", "commit", "-m", "Configure backend for Vercel deployment and clean mobile code"], check=True)
    res = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)
    print("Push Returncode:", res.returncode)
except Exception as e:
    print("Git error:", e)
