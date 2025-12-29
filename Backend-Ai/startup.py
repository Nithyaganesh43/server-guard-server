#!/usr/bin/env python3
"""
Automatic startup script for Raspberry Pi voice assistant
Ensures the server starts automatically and Ctrl+C kills everything cleanly.
"""

import os, sys, time, subprocess, signal, logging
from pathlib import Path
import threading
import requests

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[logging.FileHandler('startup.log'), logging.StreamHandler()])
logger = logging.getLogger(__name__)

class AutoStartupManager:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.flask_process = None
        self.is_running = True

    def check_dependencies(self):
        try:
            import flask, pandas, sklearn, numpy  # noqa
            logger.info("✓ All dependencies available")
            return True
        except ImportError as e:
            logger.warning(f"✗ Missing: {e}, installing...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            return True

    def start_flask_server(self):
        try:
            logger.info("Starting Flask server...")
            self.flask_process = subprocess.Popen(
                [sys.executable, "app.py"],
                cwd=self.base_dir,
                preexec_fn=os.setsid  # new process group
            )
            # Wait up to 20s for server
            start = time.time()
            while time.time() - start < 20:
                try:
                    if requests.get("http://localhost:5500/api/info", timeout=3).status_code == 200:
                        logger.info("✓ Flask server started")
                        return True
                except requests.exceptions.RequestException:
                    pass
                time.sleep(1)
            logger.error("✗ Flask server did not respond")
            return False
        except Exception as e:
            logger.error(f"Error: {e}")
            return False

    def open_voice_interface(self):
        """Open the voice interface in Chromium browser"""
        try:
            url = "http://localhost:5500/voice"
            logger.info(f"Opening Chromium: {url}")
            subprocess.Popen([
                "chromium-browser",
                "--new-window",
                "--start-maximized",
                url
            ])
        except Exception as e:
            logger.error(f"Chromium error: {e}")

    def monitor_server_health(self):
        while self.is_running:
            time.sleep(10)
            try:
                r = requests.get("http://localhost:5500/api/info", timeout=5)
                if r.status_code != 200:
                    logger.warning("Server unhealthy, restarting...")
                    self.restart_flask_server()
            except requests.exceptions.RequestException:
                logger.warning("Server down, restarting...")
                self.restart_flask_server()

    def restart_flask_server(self):
        if self.flask_process:
            try:
                os.killpg(os.getpgid(self.flask_process.pid), signal.SIGTERM)
                self.flask_process.wait()
            except ProcessLookupError:
                pass
        time.sleep(1)
        self.start_flask_server()

    def signal_handler(self, signum, frame):
        logger.info("Shutting down...")
        self.is_running = False
        if self.flask_process:
            try:
                os.killpg(os.getpgid(self.flask_process.pid), signal.SIGTERM)
                self.flask_process.wait()
            except ProcessLookupError:
                pass
        sys.exit(0)

    def run(self):
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        if not self.check_dependencies(): return
        if not self.start_flask_server(): return
        self.open_voice_interface()
        threading.Thread(target=self.monitor_server_health, daemon=True).start()
        logger.info("=== Running === Press Ctrl+C to stop")
        while self.is_running: time.sleep(1)

if __name__ == "__main__":
    AutoStartupManager().run()
