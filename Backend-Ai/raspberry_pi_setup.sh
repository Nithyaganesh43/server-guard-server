#!/bin/bash

# Raspberry Pi Auto Voice Assistant Setup Script
# This script configures the Raspberry Pi for automatic startup

echo "========================================"
echo "  Raspberry Pi Auto Voice Assistant Setup"
echo "========================================"
echo

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo "WARNING: This script is designed for Raspberry Pi"
    echo "Running on other systems may cause issues"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "Project directory: $PROJECT_DIR"
echo

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system packages
echo "Installing required system packages..."
sudo apt install -y python3 python3-pip python3-venv git curl wget

# Install audio dependencies
echo "Installing audio dependencies..."
sudo apt install -y pulseaudio pulseaudio-utils alsa-utils

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv "$PROJECT_DIR/venv"
source "$PROJECT_DIR/venv/bin/activate"

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r "$PROJECT_DIR/requirements.txt"

# Create systemd service file for automatic startup
echo "Creating systemd service for automatic startup..."
sudo tee /etc/systemd/system/voice-assistant.service > /dev/null <<EOF
[Unit]
Description=Auto Voice Assistant
After=network.target sound.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/python $PROJECT_DIR/startup.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
echo "Enabling automatic startup service..."
sudo systemctl daemon-reload
sudo systemctl enable voice-assistant.service

# Create desktop autostart entry (for GUI mode)
echo "Creating desktop autostart entry..."
mkdir -p ~/.config/autostart
tee ~/.config/autostart/voice-assistant.desktop > /dev/null <<EOF
[Desktop Entry]
Type=Application
Name=Voice Assistant
Comment=Auto Voice Assistant
Exec=$PROJECT_DIR/venv/bin/python $PROJECT_DIR/startup.py
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# Create startup script
echo "Creating startup script..."
tee "$PROJECT_DIR/start_raspberry_pi.sh" > /dev/null <<EOF
#!/bin/bash

# Raspberry Pi Auto Voice Assistant Startup Script
cd "$PROJECT_DIR"

# Activate virtual environment
source venv/bin/activate

# Start the voice assistant
python startup.py
EOF

chmod +x "$PROJECT_DIR/start_raspberry_pi.sh"

# Configure audio settings
echo "Configuring audio settings..."
# Set default audio output to auto
sudo raspi-config nonint do_audio 0

# Create audio configuration
tee ~/.asoundrc > /dev/null <<EOF
pcm.!default {
    type hw
    card 0
    device 0
}

ctl.!default {
    type hw
    card 0
}
EOF

# Configure microphone permissions
echo "Configuring microphone permissions..."
# Add user to audio group
sudo usermod -a -G audio $USER

# Create udev rules for microphone hotplug
sudo tee /etc/udev/rules.d/99-microphone.rules > /dev/null <<EOF
# Microphone hotplug rules
SUBSYSTEM=="sound", KERNEL=="card*", ACTION=="add", RUN+="/bin/bash $PROJECT_DIR/microphone_hotplug.sh add"
SUBSYSTEM=="sound", KERNEL=="card*", ACTION=="remove", RUN+="/bin/bash $PROJECT_DIR/microphone_hotplug.sh remove"
EOF

# Create microphone hotplug script
echo "Creating microphone hotplug script..."
tee "$PROJECT_DIR/microphone_hotplug.sh" > /dev/null <<EOF
#!/bin/bash

# Microphone hotplug detection script
ACTION="\$1"

if [ "\$ACTION" = "add" ]; then
    echo "Microphone connected at \$(date)" >> $PROJECT_DIR/microphone.log
    # Restart voice assistant if it's running
    if pgrep -f "startup.py" > /dev/null; then
        pkill -f "startup.py"
        sleep 2
        cd $PROJECT_DIR && source venv/bin/activate && python startup.py &
    fi
elif [ "\$ACTION" = "remove" ]; then
    echo "Microphone disconnected at \$(date)" >> $PROJECT_DIR/microphone.log
fi
EOF

chmod +x "$PROJECT_DIR/microphone_hotplug.sh"

# Create log directory
mkdir -p "$PROJECT_DIR/logs"

# Set up cron job for health monitoring
echo "Setting up health monitoring..."
(crontab -l 2>/dev/null; echo "*/5 * * * * cd $PROJECT_DIR && source venv/bin/activate && python -c \"import requests; requests.get('http://localhost:5500/api/info', timeout=5)\" >/dev/null 2>&1 || (pkill -f startup.py; sleep 2; cd $PROJECT_DIR && source venv/bin/activate && python startup.py &)") | crontab -

# Create status check script
echo "Creating status check script..."
tee "$PROJECT_DIR/check_status.sh" > /dev/null <<EOF
#!/bin/bash

# Status check script
echo "=== Voice Assistant Status ==="
echo "Service status:"
sudo systemctl status voice-assistant.service --no-pager -l

echo
echo "Process status:"
pgrep -f "startup.py" && echo "✓ Voice assistant is running" || echo "✗ Voice assistant is not running"

echo
echo "Port status:"
netstat -tlnp | grep :5500 && echo "✓ Server is listening on port 5500" || echo "✗ Server is not listening on port 5500"

echo
echo "Recent logs:"
tail -n 10 $PROJECT_DIR/startup.log 2>/dev/null || echo "No log file found"
EOF

chmod +x "$PROJECT_DIR/check_status.sh"

# Create stop script
echo "Creating stop script..."
tee "$PROJECT_DIR/stop_voice_assistant.sh" > /dev/null <<EOF
#!/bin/bash

# Stop voice assistant script
echo "Stopping voice assistant..."
sudo systemctl stop voice-assistant.service
pkill -f "startup.py"
echo "Voice assistant stopped"
EOF

chmod +x "$PROJECT_DIR/stop_voice_assistant.sh"

echo
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo
echo "The voice assistant will now start automatically when you:"
echo "1. Boot the Raspberry Pi"
echo "2. Connect/disconnect a microphone"
echo
echo "Manual commands:"
echo "  Start:  sudo systemctl start voice-assistant.service"
echo "  Stop:   sudo systemctl stop voice-assistant.service"
echo "  Status: $PROJECT_DIR/check_status.sh"
echo "  Logs:   tail -f $PROJECT_DIR/startup.log"
echo
echo "The voice interface will be available at:"
echo "  http://localhost:5500/voice"
echo "  http://[raspberry-pi-ip]:5500/voice"
echo
echo "To start the service now, run:"
echo "  sudo systemctl start voice-assistant.service"
echo
echo "Setup complete! Rebooting is recommended."
read -p "Reboot now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi
