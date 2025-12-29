// ZeNoVa Voice Assistant - Vanilla JavaScript Version
// 100% identical logic to the React component

// State variables (equivalent to React useState)
let isStarted = false;
let homeName = "";
let currentText = "";
let systemState = 'idle';
let deviceState = {
  light: false,
  fan: false,
  pump: false,
};

// Refs for managing state and preventing race conditions (equivalent to React useRef)
let recognitionRef = null;
let synthRef = null;
let systemStateRef = 'idle';
let homeNameRef = "";
let restartTimeoutRef = null;
let permissionsGrantedRef = false;
let isListeningActiveRef = false;
let nextActionRef = null;

const API_KEY = "m4Z8&XqW!T2^P7Y@V9b$N1K5g*J3RC6xQz&pM^v!Gt$yXnBwK8T";

// DOM elements
const mainButton = document.getElementById('mainButton');
const currentTextContainer = document.getElementById('currentTextContainer');
const currentTextContent = document.getElementById('currentTextContent');

// Helper function to update system state (equivalent to React setSystemState)
function updateSystemState(newState) {
  systemState = newState;
  systemStateRef = newState;
  
  // Update button classes
  mainButton.className = `main-button ${newState}`;
  
  // Update button disabled state based on system state (like Next.js)
  mainButton.disabled = newState === 'processing' || newState === 'requesting_permissions';
  
  // Update button inner content when state changes
  updateButtonInner();
  
  // Execute pending action when state changes appropriately
  if (nextActionRef && (newState === 'naming' || newState === 'ready' || newState === 'listening')) {
    const action = nextActionRef;
    nextActionRef = null;
    setTimeout(action, 100); // Small delay to ensure state is stable
  }
}

// Helper function to update home name (equivalent to React setHomeName)
function updateHomeName(newName) {
  homeName = newName;
  homeNameRef = newName;
}

// Helper function to update current text (equivalent to React setCurrentText)
function updateCurrentText(newText) {
  currentText = newText;
  if (newText) {
    currentTextContainer.style.display = 'block';
    currentTextContent.innerHTML = highlightHomeName(newText);
  } else {
    currentTextContainer.style.display = 'none';
  }
}

// Helper function to update device state (equivalent to React setDeviceState)
function updateDeviceState(newState) {
  deviceState = { ...newState };
}

// Helper function to update isStarted (equivalent to React setIsStarted)
function updateIsStarted(newValue) {
  isStarted = newValue;
  
  // Update button click handler based on state
  if (newValue) {
    mainButton.onclick = handleStop;
  } else {
    mainButton.onclick = handleStart;
  }
}

// Initialize speech synthesis
function initializeSpeechSynthesis() {
  if (typeof window !== "undefined") {
    synthRef = window.speechSynthesis;
  }
}

// Monitor microphone connection/disconnection
function startMicrophoneMonitoring() {
  // Check microphone availability every 5 seconds
  setInterval(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (audioDevices.length === 0) {
        console.log("No microphone detected - pausing voice");
        if (isStarted && systemState !== 'idle') {
          updateSystemState('microphone_disconnected');
          if (recognitionRef) {
            recognitionRef.stop();
            recognitionRef = null;
            isListeningActiveRef = false;
          }
        }
      } else {
        console.log(`Microphone detected: ${audioDevices.length} device(s)`);
       if (isStarted && systemState === 'microphone_disconnected') {
         console.log('Microphone reconnected - reloading page');
         window.location.reload();
       }
      }
    } catch (error) {
      console.error("Error checking microphone:", error);
    }
  }, 5000);
}

// Cleanup function
function cleanup() {
  isListeningActiveRef = false;
  nextActionRef = null;
  
  if (restartTimeoutRef) {
    clearTimeout(restartTimeoutRef);
    restartTimeoutRef = null;
  }
  
  if (recognitionRef) {
    try {
      recognitionRef.stop();
    } catch (e) {
      // Recognition already stopped
    }
    recognitionRef = null;
  }
  
  if (synthRef) {
    try {
      synthRef.cancel();
    } catch (e) {
      // Speech already cancelled
    }
  }
}

// Request permissions function
async function requestPermissions() {
  try {
    updateSystemState('requesting_permissions');
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      } 
    });
    
    // Test speaker
    if (synthRef) {
      const testUtterance = new SpeechSynthesisUtterance("Test");
      testUtterance.volume = 0.05;
      synthRef.speak(testUtterance);
    }
    
    // Close test stream
    stream.getTracks().forEach(track => track.stop());
    
    permissionsGrantedRef = true;
    return true;
  } catch (error) {
    updateSystemState('idle');
    return false;
  }
}

// Speak function
async function speak(text, nextAction) {
  return new Promise((resolve) => {
    if (systemStateRef === 'idle') {
      resolve();
      return;
    }

    // Store next action to execute after speech
    if (nextAction) {
      nextActionRef = nextAction;
    }

    // Stop any ongoing recognition immediately
    if (recognitionRef) {
      recognitionRef.stop();
      recognitionRef = null;
      isListeningActiveRef = false;
    }

    updateSystemState('speaking');
    updateCurrentText(text);

    if (synthRef) {
      synthRef.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        // Speech started
      };

      utterance.onend = () => {
        updateCurrentText("");
        
        // Change state immediately after speech ends (exact match to Next.js)
        if (systemStateRef === 'speaking') {
          if (homeNameRef) {
            updateSystemState('ready');
          } else {
            updateSystemState('naming');
          }
        }
        
        // Short delay before resolving to ensure state transition (exact match to Next.js)
        setTimeout(() => {
          resolve();
        }, 300);
      };

      utterance.onerror = (error) => {
        updateCurrentText("");
        updateSystemState(homeNameRef ? 'ready' : 'naming');
        resolve();
      };

      synthRef.speak(utterance);
    } else {
      updateSystemState(homeNameRef ? 'ready' : 'naming');
      resolve();
    }
  });
}

// Process command function
async function processCommand(command) {
  if (!command.trim() || systemStateRef === 'idle') {
    return;
  }

  updateSystemState('processing');

  try {
    const response = await fetch("https://zenova-server.onrender.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        API_KEY,
        message: command,
      }),
    });

    if (response.ok) {
      const result = await response.text();
      await executeDeviceCommands(result);
    } else {
      await speak("Sorry, I couldn't process that command", () => startListening());
      return;
    }
  } catch (error) {
    await speak("Sorry, connection error", () => startListening());
    return;
  }

  // Schedule next listen after processing
  scheduleNextListen(1000);
}

// Execute device commands function
async function executeDeviceCommands(commands) {
  if (!commands || systemStateRef === 'idle') return;

  const newState = { ...deviceState };
  const changes = [];

  for (const digit of commands) {
    switch (digit) {
      case "0":
        if (newState.light) {
          newState.light = false;
          changes.push("Light off");
        }
        break;
      case "1":
        if (!newState.light) {
          newState.light = true;
          changes.push("Light on");
        }
        break;
      case "2":
        if (newState.fan) {
          newState.fan = false;
          changes.push("Fan off");
        }
        break;
      case "3":
        if (!newState.fan) {
          newState.fan = true;
          changes.push("Fan on");
        }
        break;
      case "4":
        if (newState.pump) {
          newState.pump = false;
          changes.push("Pump off");
        }
        break;
      case "5":
        if (!newState.pump) {
          newState.pump = true;
          changes.push("Pump on");
        }
        break;
      default:
        // Unknown command
    }
  }

  updateDeviceState(newState);

  if (changes.length > 0) {
    const announcement = changes.join(", ");
    await speak(announcement, () => startListening());
  } else {
    await speak("Done", () => startListening());
  }
}

// Schedule next listen function
function scheduleNextListen(delay = 1000) {
  if (restartTimeoutRef) {
    clearTimeout(restartTimeoutRef);
  }

  restartTimeoutRef = setTimeout(() => {
    startListening();
  }, delay);
}

// Start listening function
function startListening() {
  // Comprehensive checks
  if (systemStateRef === 'idle') {
    return;
  }
  
  if (systemStateRef === 'speaking') {
    scheduleNextListen(500);
    return;
  }
  
  if (systemStateRef === 'processing') {
    scheduleNextListen(500);
    return;
  }

  if (recognitionRef || isListeningActiveRef) {
    return;
  }

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return;
  }

  // Create recognition instance
  recognitionRef = new SpeechRecognition();
  isListeningActiveRef = true;
  
  // Configure for maximum accuracy
  recognitionRef.continuous = false;
  recognitionRef.interimResults = true;
  recognitionRef.lang = "en-US";
  recognitionRef.maxAlternatives = 5;

  const mode = systemStateRef === 'naming' ? 'naming' : 'listening';
  updateSystemState(systemStateRef === 'naming' ? 'naming' : 'listening');
  updateCurrentText("");

  recognitionRef.onstart = () => {
    // Recognition active
  };

  recognitionRef.onresult = async (event) => {
    if (systemStateRef === 'idle') return;

    let bestTranscript = "";
    let bestConfidence = 0;
    let isFinal = false;

    // Process all alternatives
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) isFinal = true;

      for (let j = 0; j < result.length; j++) {
        const alternative = result[j];
        const transcript = alternative.transcript.trim();
        const confidence = alternative.confidence || 0.8;

        if (systemStateRef === 'naming') {
          const words = transcript.split(/\s+/);
          if (words.length === 1 && words[0].length > 1 && confidence > bestConfidence) {
            bestTranscript = transcript;
            bestConfidence = confidence;
          }
        } else {
          if (confidence > bestConfidence) {
            bestTranscript = transcript;
            bestConfidence = confidence;
          }
        }
      }
    }

    // Show interim results
    if (bestTranscript && !isFinal) {
      updateCurrentText(`${bestTranscript}...`);
    }

    if (!isFinal || !bestTranscript) return;

    updateCurrentText(bestTranscript);

      // Handle naming (exact match to Next.js)
      if (systemStateRef === 'naming') {
        const name = bestTranscript.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');

        if (name && name.length > 1 && bestConfidence > 0.4) {
          updateHomeName(name);
          homeNameRef = name;
          
          await speak(`Hello, I am ${name}, your AI-powered home assistant. Ready for commands.`, () => startListening());
        } else {
          await speak("Please say the house name clearly", () => startListening());
        }
        return;
      }

    // Handle commands
    if (systemStateRef === 'listening' && homeNameRef && bestConfidence > 0.5) {
      const lowerText = bestTranscript.toLowerCase();
      const lowerHomeName = homeNameRef.toLowerCase();

      const patterns = [lowerHomeName, `hey ${lowerHomeName}`, `hi ${lowerHomeName}`];
      let found = false;
      let command = "";

      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          found = true;
          const idx = lowerText.indexOf(pattern);
          command = bestTranscript.substring(idx + pattern.length).trim();
          break;
        }
      }

      if (found) {
        if (command) {
          await processCommand(command);
        } else {
          await speak("Yes?", () => startListening());
        }
      } else {
        scheduleNextListen(800);
      }
    } else {
      scheduleNextListen(800);
    }
  };

  recognitionRef.onerror = (event) => {
    recognitionRef = null;
    isListeningActiveRef = false;

    if (event.error === "not-allowed") {
      updateSystemState('idle');
      updateIsStarted(false);
    } else if (event.error === "no-speech") {
      scheduleNextListen(1000);
    } else {
      scheduleNextListen(2000);
    }
  };

  recognitionRef.onend = () => {
    recognitionRef = null;
    isListeningActiveRef = false;

    if (systemStateRef === 'listening' || systemStateRef === 'naming') {
      scheduleNextListen(1000);
    }
  };

  try {
    recognitionRef.start();
  } catch (error) {
    recognitionRef = null;
    isListeningActiveRef = false;
    scheduleNextListen(2000);
  }
}

// Handle start function
async function handleStart() {
  if (isStarted) return;

  const hasPermissions = await requestPermissions();
  if (!hasPermissions) {
    return;
  }

  updateIsStarted(true);
  
  // Speak and set up next action
  await speak("Name the house", () => {
    startListening();
  });
}

// Handle stop function
function handleStop() {
  updateIsStarted(false);
  updateSystemState('idle');
  updateCurrentText("");
  updateHomeName("");
  homeNameRef = "";
  permissionsGrantedRef = false;
  isListeningActiveRef = false;
  nextActionRef = null;
  
  cleanup();
}

// Highlight home name function
function highlightHomeName(text) {
  if (!homeName || !text) return text;

  const regex = new RegExp(`\\b(${homeName})\\b`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    part.toLowerCase() === homeName.toLowerCase() ? 
      `<span class="home-name-highlight">${part}</span>` : 
      part
  ).join('');
}

// Update button inner content based on state
function updateButtonInner() {
  const buttonInner = mainButton.querySelector('.button-inner');
  
  if (isStarted) {
    buttonInner.innerHTML = `<div class="status-square ${systemState}"></div>`;
  } else {
    buttonInner.innerHTML = '<div class="play-icon"></div>';
  }
}

// Initialize the application
function initializeApp() {
  // Set up event listeners
  mainButton.onclick = handleStart;
  
  // Initialize speech synthesis
  initializeSpeechSynthesis();
  
  // Set initial button state - ensure button is enabled and ready
  mainButton.disabled = systemState === 'processing' || systemState === 'requesting_permissions';
  updateButtonInner();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  
  // Auto-start voice assistant after 2 seconds
  setTimeout(() => {
    console.log("Auto-starting voice assistant...");
    handleStart();
  }, 2000);
  
  // Monitor microphone connection/disconnection
  startMicrophoneMonitoring();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);