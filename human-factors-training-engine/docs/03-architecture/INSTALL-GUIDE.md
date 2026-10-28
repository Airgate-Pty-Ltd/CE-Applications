# HF Engine — Install Guide (Standalone Windows Edition)

**Who this is for:** the person setting up HF Engine on a Windows computer — no software
development experience required, no other programs need to be installed first.

**How to use this guide:** work through the numbered steps in order. Every step ends with a
line starting **You should now see** — that is how you know the step worked. If what you see
does not match, **stop. Do not continue to the next step.** Go to
[Troubleshooting](#troubleshooting) instead, find the matching symptom, and fix it before
moving on. Continuing past a failed step will not work and can make the problem harder to
diagnose.

---

## Prerequisites

You need:
- A Windows 10 or Windows 11 computer (64-bit).
- About 200 MB of free disk space.
- The installation file: `HF-Engine-Standalone-Windows-v<version>.zip`, found in this
  repository at `deploy/dist/`. That is the **only** file you need — a versioned zip, built
  fresh for release.

**Never run anything directly from `deploy/installer-windows/`.** That folder is the build
workshop used to *produce* the zip in `deploy/dist/` — it also contains developer-only build
scripts (`build-package.ps1`, `fetch-node-runtime.ps1`, `build-dist.ps1`) and whatever
leftover test database happens to be sitting in its `data/` folder from the last build session.
Running `Start HF Engine.bat` from inside the workshop instead of from an extracted copy of
the real zip will serve a stale, possibly out-of-date build against stale test data — this
has happened once already (DECISIONS.md D-054) and produced confusing failed logins against
demo-looking credentials that were never actually valid. If you're not sure which one you're
looking at: the real product folder is named plain `HF-Engine` (from extracting the zip); the
workshop is named `installer-windows` and sits next to a `docker-optional` folder.

You do **not** need to install anything else first — not Node.js, not a database, not Docker,
not any developer tools. Everything HF Engine needs is inside the zip file already. If anyone
tells you that you need to install something else before this guide works, stop and check with
whoever gave you this file — that is not correct for this version of HF Engine.

You do not need administrator rights on the computer, as long as you install to a normal
folder you already have access to (your Desktop, Documents, or a folder like `C:\HFEngine`).
Installing into `C:\Program Files` is possible but requires administrator rights and is not
covered by this guide.

---

## Step 1 — Extract the zip file

1. Copy `HF-Engine-Standalone-Windows-v<version>.zip` (from `deploy/dist/` — see
   [Prerequisites](#prerequisites)) to where you want HF Engine to live permanently — for
   example your Desktop, or `C:\HFEngine`. **Pick this location carefully: this is where your
   training data will be stored from now on. Do not move this folder later without following
   the [Backup and Restore](#backup-and-restore) procedure.**
2. Right-click the zip file and choose **Extract All...**, then **Extract**.
3. Open the folder that appears. It is named `HF-Engine`.

**You should now see**, inside the `HF-Engine` folder: a file named `Start HF Engine.vbs`, a
file named `Backup Database.bat`, and three folders named `app`, `runtime`, and `tools`.

If you see only one file, or the folder looks incomplete, the extraction did not finish —
delete the extracted folder and repeat Step 1.

---

## Step 2 — First run

1. Double-click **Start HF Engine.vbs**.
2. **No window opens.** This is correct — HF Engine runs quietly in the background. Look at
   the bottom-right of your screen, in the row of small icons next to the clock (the "system
   tray") — a new icon appears there within a few seconds. That icon is HF Engine; hover over
   it and it should read **"HF Engine - Running on port 3210."** If you don't see it right
   away, click the small **^** arrow in that row to show hidden icons.
3. Your default web browser opens automatically to a page titled **"Welcome to HF Engine."**

**You should now see** the tray icon with the "Running on port 3210" tooltip, and your browser
showing the "Welcome to HF Engine" setup page.

If Windows shows a blue "Windows protected your PC" warning instead, see
[Troubleshooting](#windows-protected-your-pc-smartscreen-warning).

If no browser window opens after about 45 seconds, or the tray tooltip says "FAILED to start"
or keeps saying "Starting," see [Troubleshooting](#no-icon-in-the-tray--hf-engine-is-not-running).

---

## Step 3 — Create your administrator account

This is a one-time step. It only works the very first time HF Engine runs — after this, this
page will refuse to create a second administrator this way (that is intentional, so a stranger
can't do it later).

1. On the "Welcome to HF Engine" page, fill in:
   - **Full Name** — your name.
   - **Email Address** — the email you'll use to log in (this does not need to be a real,
     working mailbox — it's just your username).
   - **Password** / **Confirm Password** — a password with at least 8 characters, one capital
     letter, and one number.
2. Click **Create Admin Account**.

**You should now see** your browser move to a new page (the main dashboard), confirming you
are logged in.

If you see a red error message instead, read it — it will tell you exactly what to fix (for
example, a weak password or mismatched passwords). Correct it and click the button again.

---

## Step 4 — About the file that keeps you logged in (JWT_SECRET)

You don't need to do anything for this step — it's context for later, and for
[Troubleshooting](#everyone-is-logged-out-unexpectedly).

The first time you ran Step 2, HF Engine generated a random secret code and saved it to
`HF-Engine\data\jwt-secret.txt` (created automatically — you don't need to find or open it).
This code is what lets your browser stay logged in between visits.

- **It must stay the same for as long as this installation is running.** Don't edit, move, or
  delete `jwt-secret.txt`.
- **If it's ever lost or changed:** nothing bad happens to your training data — every user
  will simply need to log in again next time, because their old sessions no longer match the
  new code. Nothing is deleted.
- **If you ever need to generate a new one on purpose** (for example, you suspect it leaked):
  delete `data\jwt-secret.txt` and restart HF Engine — a new one is generated automatically,
  and (as above) everyone will need to log in again.
- **If you ever need to set one yourself instead of letting HF Engine generate it** (advanced
  use only — most people never need this): open PowerShell in the `HF-Engine` folder and run
  ```powershell
  .\runtime\node-win-x64\node.exe -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  This prints a long random code. Paste it as the entire contents of `data\jwt-secret.txt`
  (create the `data` folder and the file if they don't exist yet), then start HF Engine.

---

## Step 5 — Create accounts for your team

Your administrator account can do everything, but for day-to-day use you'll want separate
accounts for the people who manage training (**QM**), verify its effectiveness
(**supervisor**), and take it (**learner**).

1. In your browser, go to `http://127.0.0.1:3210/admin/users`.
2. Fill in a name, email, a password you choose for that person, and pick their role from the
   dropdown.
3. Click **Create Account**.
4. Repeat for each person who needs access.

**You should now see** each new account appear in the table at the bottom of the page as soon
as you create it.

Share each person's email and the password you set for them directly and securely (in person,
or however you'd normally share a new password) — HF Engine does not email it to them.

---

## Admin Quick Reference (interim — read this)

**Known limitation, being fixed in a future update:** after logging in, an administrator
account lands on a generic screen with no menu, and there is currently no on-screen way to
reach the other admin/QM/supervisor screens by clicking — you have to type the address
directly into your browser, the same way you reached `/admin/users` in Step 5. QM, supervisor,
and learner accounts already have a real navigation menu once they're on one of *their*
screens (below) — it's specifically the admin landing page and the pages listed under
**Admin** below that don't yet have one. This table exists so the product is fully usable
in the meantime. Type these directly into your browser's address bar, replacing
`http://127.0.0.1:3210` with your actual address if you changed the port.

| Screen | Address | Who it's for |
|---|---|---|
| Accounts | `http://127.0.0.1:3210/admin/users` | Admin — create/list user accounts (Step 5) |
| Enrollment dashboard | `http://127.0.0.1:3210/admin/dashboard` | Admin — completion stats |
| Enrollments | `http://127.0.0.1:3210/admin/enrollments` | Admin — assign learners to courses |
| Source Intake | `http://127.0.0.1:3210/intake` | QM — ingest and review evidence |
| Content Authoring | `http://127.0.0.1:3210/content-authoring` | QM — author and approve training content |
| Kernel Conditions | `http://127.0.0.1:3210/kernel-conditions` | QM — respond to system-detected conditions |
| Traceability | `http://127.0.0.1:3210/traceability` | QM — trace evidence to training and back |
| Defense Dossier | `http://127.0.0.1:3210/dossier` | QM — regulatory defense records |
| Drift Watch | `http://127.0.0.1:3210/drift-watch` | QM — training drift report |
| Policy Packs | `http://127.0.0.1:3210/policy-packs` | QM — policy pack administration |
| Burden Budget | `http://127.0.0.1:3210/burden-budget` | QM/supervisor — training load management |
| Manager View | `http://127.0.0.1:3210/manager` | Supervisor — verify training effectiveness |
| My Training | `http://127.0.0.1:3210/my-training` | Learner — assigned training |
| System Health | `http://127.0.0.1:3210/health` | Everyone — live status board |

Once you're on a QM, supervisor, or learner screen from this table, the menu at the top will
let you reach every other screen for that role by clicking — this quick reference is only
needed to get there the first time, and for the admin-only pages until the fix lands.

---

## Step 6 — Stop HF Engine

Right-click the HF Engine icon in the system tray and choose **Stop HF Engine**.

**You should now see** the tray icon disappear, and `http://127.0.0.1:3210` in your browser
stop loading if you refresh it (this confirms the app really stopped, not just the icon
hiding).

Your data is not affected by stopping HF Engine — it's saved to disk continuously as people
use it, not just when you stop the app. Simply logging off Windows or restarting your computer
also stops HF Engine cleanly (nothing is left running in the background once you're logged
out) — you don't need to remember to right-click Stop first, though it doesn't hurt to.

---

## Step 7 — Restart HF Engine

1. Double-click **Start HF Engine.vbs** again, the same as Step 2.

**You should now see** the tray icon reappear with the "Running on port 3210" tooltip. To
double-check it recognized your existing data rather than starting over: right-click the tray
icon, choose **View Logs**, and confirm the most recent entries say **"Existing database
found... skipping migration"** (not "First run detected"). Log back in with the account(s) you
created earlier and confirm your data (accounts, any training activity) is still there.

---

## Backup and Restore

### Making a backup

Do this regularly — weekly at minimum, and always before moving HF Engine to a different
folder or computer.

1. Make sure HF Engine is stopped (Step 6) — this isn't strictly required, but avoids backing
   up mid-write.
2. Double-click **Backup Database.bat**. (Unlike starting HF Engine, this one briefly opens a
   console window on purpose — a backup is a short, one-off action worth watching finish, not
   a long-running server, so there's no console-window problem here to solve.)

**You should now see** a console window print a line starting **"Backup complete:"** followed
by a file path, then a `sha256:` line, then a `size:` line, before it says "Press any key to
close this window." The backup file is saved inside `HF-Engine\backups\`, named
`backup-<date/time>.db`.

**Copy the entire `backups` folder somewhere off this computer** — a USB drive, a network
share, cloud storage — regularly. A backup that only exists on the same machine does not
protect you from that machine's disk failing.

### Restoring a backup (disaster recovery)

Use this if the computer HF Engine was on is no longer available, or its data is lost or
corrupted. **Restore into a fresh copy of HF Engine, not on top of a machine you suspect is
already having a problem** — this is safer, and it's exactly how this procedure has been
tested.

1. Extract a fresh copy of `HF-Engine-Standalone-Windows-v<version>.zip` (Step 1) to a new
   folder — do not reuse a folder that already has a `data` folder in it.
2. Copy your saved backup file (`backup-<date/time>.db`) and its matching `latest.json` (both
   from your off-machine copy of the `backups` folder) into the new `HF-Engine` folder.
3. Open PowerShell in that new `HF-Engine` folder (hold Shift, right-click inside the folder in
   File Explorer, choose "Open PowerShell window here").
4. Run:
   ```powershell
   .\restore.ps1 -FromManifest ".\latest.json"
   ```

**You should now see** three lines: `Restore complete:` (with a file path), `Verified sha256:`
(a long code), and — only if a database already existed at the target — a `Pre-restore safety
copy:` line. If instead you see `Backup integrity check FAILED`, the backup file itself is
damaged; go back to a different, older backup.

5. Double-click **Start HF Engine.vbs** in this new folder.

**You should now see** the tray icon appear, and (via **View Logs** from its right-click menu)
the log's most recent entries say **"Existing database found... skipping migration"** (same as
Step 7). Everyone's accounts and training data from the backup should be there when you log in.

---

## Uninstalling

HF Engine does not touch anything outside its own folder — it does not install a Windows
service, and does not add itself to Start Menu or Programs and Features. It does run quietly
in the background (that's the tray icon) for as long as you leave it running, but nothing
survives a Stop, a log-off, or a restart of the computer — there is no hidden always-on
component to separately remove.

1. Make a final backup first if you want to keep the data (see above).
2. Stop HF Engine if it's running (Step 6).
3. Delete the `HF-Engine` folder.

**You should now see** the folder gone, and nothing left behind anywhere else on the computer.

---

## Troubleshooting

### No icon in the tray = HF Engine is not running

If you don't see the tray icon, or the tray tooltip says **"FAILED to start"** or
**"STOPPED (unexpected)"**, HF Engine is not currently running — do not assume it's fine
because "it's usually there." Check `HF-Engine\logs\hfengine.log` (right-click the tray icon
and choose **View Logs** if the icon is still there; otherwise open the file directly from the
`HF-Engine` folder in Notepad) for the most recent entries and what they say. This log
contains everything that used to print to the console window in earlier versions of this
guide — nothing is hidden, it just moved to a file since there's no console window anymore.

### The FATAL message about a "marker" when starting

If `logs\hfengine.log` shows a line starting **"FATAL"** and mentioning a **marker**, **do not
delete anything, and do not try to "fix" it by removing files.** This message means HF Engine
found evidence that this installation was used before (real training data may exist), but it
could not find or read a matching, healthy database file where it expected one.

This is a safety feature, not a bug: HF Engine refuses to silently create a brand-new, empty
database in this situation, because that would look like it "just works" while actually
discarding your real data with no warning. The tray tooltip will say "FAILED to start" and you
will get a notification balloon when this happens — it will not fail silently.

**What to do:** restore your most recent backup using the [Restore](#restoring-a-backup-disaster-recovery)
procedure above, into a fresh copy of HF Engine. If you don't have a backup, contact support
before doing anything else to this folder — the original files may still be partially
recoverable, and further changes could make that harder.

### Everyone is logged out unexpectedly

See [Step 4](#step-4--about-the-file-that-keeps-you-logged-in-jwt_secret). This means the
`jwt-secret.txt` file changed or was deleted. Your data is not affected — everyone just needs
to log in again.

### "Windows protected your PC" (SmartScreen warning)

Windows sometimes shows this for files downloaded from the internet, even safe ones, because
they aren't digitally signed by a recognized publisher. Click **More info**, then **Run
anyway**. This only needs to happen once per file.

### The browser shows "This site can't be reached"

HF Engine either isn't running, or is still starting up. Check the tray tooltip and
`logs\hfengine.log` for the most recent entries. If it still says "Starting" after about a
minute, or you don't see the tray icon at all, see
[No icon in the tray](#no-icon-in-the-tray--hf-engine-is-not-running) above.

### Port 3210 is already in use

If another program is already using port 3210, `logs\hfengine.log` will show an error
mentioning `EADDRINUSE`. Either close the other program and try again, or use a different
port: open PowerShell in the `HF-Engine` folder and run
```powershell
$env:PORT = "3211"
.\start.ps1
```
then open `http://127.0.0.1:3211` yourself. This runs HF Engine in a plain, visible console
window on the alternate port, without the tray — a custom port isn't possible through the
`Start HF Engine.vbs` double-click shortcut, only this way, which is fine for this kind of
one-off troubleshooting.
