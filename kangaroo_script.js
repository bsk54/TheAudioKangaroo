// Note: This script assumes you have a global `project`, `firstAudio`, `availableLanguages`,
// `lessons`, `snippetData` defined in creole_txt.js and creole_snp.js.

// Get DOM Elements
const audioElement = document.getElementById('audio');
const snippetCounterButton = document.getElementById('snippet-counter-button');
const playPauseButton = document.getElementById('play-pause');
const nightModeToggle = document.getElementById('night-mode-toggle');
const audioFileNameDisplay = document.getElementById('audio-file-name');
const titleElement = document.getElementById('title');

const landscapeControls = document.getElementById('landscape-controls');
// const playPauseLandscape = document.getElementById('play-pause-landscape');
const nextSnippetLandscape = document.getElementById('next-snippet-landscape');
const lastSnippetLandscape = document.getElementById('last-snippet-landscape');

// Speed Toggle Buttons
const speedToggleButton = document.getElementById('speed-toggle');
const speedToggleLandscapeButton = document.getElementById('speed-toggle-landscape');

// Lesson Display Element
const lessonDisplay = document.getElementById('lesson-display');

// Cont./Loop Mode Elements
const contLoopToggle = document.getElementById('cont-loop-toggle');
const modeIndicator = document.getElementById('mode-indicator');

// Snippet navigation buttons
const nextSnippetButton = document.getElementById('next-snippet');
const lastSnippetButton = document.getElementById('last-snippet');

// Time shift buttons
const rewind3Button = document.getElementById('rewind-3');
const forward3Button = document.getElementById('forward-3');

// Font Size Toggle Button
const fontToggleButton = document.getElementById('font-toggle');

// Pause Toggle Button
const pauseToggleButton = document.getElementById('pause-toggle');

// Modal Elements for Initial File Selection
const initialModal = document.getElementById('initial-file-modal');
const closeInitialModalButton = document.getElementById('close-initial-modal');
const initialFileInput = document.getElementById('initial-audio-file');
const serverMp3List = document.getElementById('server-mp3-list');
const loadSelectedMp3Button = document.getElementById('load-selected-mp3');

// New Audio Button to Open the Modal
const audioFileButton = document.getElementById('open-modal-button');

// Global Variables
let currentAudioFile = null;
let snippets = [];
let isPlaying = false;
let playbackSpeed = 1.0;
let currentLesson = null;
let isLoopMode = false; 
let currentLoopSnippet = null; 
let secondLanguage = "French";

// Playback Speeds Array for Toggle Buttons
const playbackSpeeds = [1.0, 0.75, 0.5];
let currentSpeedIndex = 0;

// Font Sizes Array
const fontSizes = ['18px', '21px', '24px', '27px', '12px', '15px'];
let currentFontSizeIndex = 0;

const rtlLanguages = [
    "Arabic",
    "Hebrew",
    "Persian",
    "Urdu",
    "Yiddish"
];

// Font Families Array
const fontFamilies = [
    'Courier New, Courier, monospace',
    'Arial, sans-serif',
    'Times New Roman, Times, serif',
    'Verdana, Geneva, sans-serif',
    'Georgia, serif'
];
let currentFontFamilyIndex = 0;

// Pause Durations
const pauseDurations = [0, 1000, 2000, 3000, 4000];
let currentPauseIndex = 0;

// Utility Functions
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function saveSnippetsToLocalStorage(fileName, snippetsArray) {
    let allSnippets = JSON.parse(localStorage.getItem('audioKangaroo_snippets')) || {};
    allSnippets[fileName] = snippetsArray;
    localStorage.setItem('audioKangaroo_snippets', JSON.stringify(allSnippets));
}

function loadSnippetsFromLocalStorage(fileName) {
    let allSnippets = JSON.parse(localStorage.getItem('audioKangaroo_snippets')) || {};
    return allSnippets[fileName] || [];
}

function saveCurrentSettings() {
    const settings = {
        secondLanguage: secondLanguage,
        fontSizeIndex: currentFontSizeIndex,
        fontFamilyIndex: currentFontFamilyIndex
    };
    localStorage.setItem('audioKangaroo_settings', JSON.stringify(settings));
}

function loadSettingsFromLocalStorage() {
    let settings = JSON.parse(localStorage.getItem('audioKangaroo_settings')) || {};
    return settings;
}

function applySettings() {
    const settings = loadSettingsFromLocalStorage();
    if (settings.secondLanguage && availableLanguages.includes(settings.secondLanguage)) {
        secondLanguage = settings.secondLanguage;
    }

    if (typeof settings.fontSizeIndex === 'number' && settings.fontSizeIndex < fontSizes.length) {
        currentFontSizeIndex = settings.fontSizeIndex;
    } else {
        currentFontSizeIndex = 0;
    }

    if (typeof settings.fontFamilyIndex === 'number' && settings.fontFamilyIndex < fontFamilies.length) {
        currentFontFamilyIndex = settings.fontFamilyIndex;
    } else {
        currentFontFamilyIndex = 0;
    }

    document.body.style.fontSize = fontSizes[currentFontSizeIndex];
    document.body.style.fontFamily = fontFamilies[currentFontFamilyIndex];

    const lessonTable = document.getElementById('lesson-table');
    if (lessonTable) {
        lessonTable.style.fontSize = fontSizes[currentFontSizeIndex];
        lessonTable.style.fontFamily = fontFamilies[currentFontFamilyIndex];
    }
}

function extractBaseName(fileNameOrUrl) {
    let fileName;
    try {
        const url = new URL(fileNameOrUrl);
        fileName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
    } catch (e) {
        fileName = fileNameOrUrl;
    }

    let withoutExt = fileName.replace(/\.[^/.]+$/, '');
    let fullBaseName = withoutExt; 
    let baseName = withoutExt.replace(new RegExp(`^${project}`), '');

    return { fullBaseName, baseName };
}

function findLessonByIdentifier(identifier) {
    const lessonId = parseInt(identifier, 10);
    if (isNaN(lessonId)) {
        console.error('Invalid lesson identifier.');
        return null;
    }
    const lesson = lessons.find(lesson => lesson.id === lessonId) || null;
    return lesson;
}

function loadSnippetsFromData(baseName) {
    if (!baseName) return [];
    let filtered = snippetData.filter(entry => entry[0] === baseName);
    let snippetArray = filtered.map(entry => {
        return { start: entry[1] / 1000.0, end: entry[2] / 1000.0 };
    });
    return snippetArray;
}

function displayLesson() {
    if (!currentLesson) {
        console.error('No lesson loaded to display.');
        return;
    }

    lessonDisplay.innerHTML = '';
    const table = document.createElement('table');
    table.id = 'lesson-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const hasTranscription = currentLesson.sentences.some(sentence => sentence.transcription && sentence.transcription.trim() !== '');
    const headers = ['Original'];
    if (hasTranscription) {
        headers.push('Transcription');
    }
    headers.push(secondLanguage);

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // Determine if the second language is RTL
    const isRTL = rtlLanguages.includes(secondLanguage);

    currentLesson.sentences.forEach(sentence => {
        if (!sentence.original) return;
        const row = document.createElement('tr');

        const originalCell = document.createElement('td');
        originalCell.textContent = sentence.original || '';
        row.appendChild(originalCell);

        if (hasTranscription) {
            const transcriptionCell = document.createElement('td');
            transcriptionCell.textContent = sentence.transcription || '';
            row.appendChild(transcriptionCell);
        }

        const translationCell = document.createElement('td');
        if (sentence.translations && sentence.translations[secondLanguage]) {
            translationCell.textContent = sentence.translations[secondLanguage];
        } else {
            translationCell.textContent = 'N/A';
        }

        // Apply RTL attributes if necessary
        if (isRTL) {
            translationCell.setAttribute('dir', 'rtl');
            translationCell.style.textAlign = 'right';
        } else {
            translationCell.setAttribute('dir', 'ltr');
            translationCell.style.textAlign = 'left';
        }

        row.appendChild(translationCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const tableContainer = document.createElement('div');
    tableContainer.style.width = '90%';
    tableContainer.style.maxHeight = '80vh';
    tableContainer.style.overflowY = 'auto';
    tableContainer.style.margin = '0';

    table.style.border = '1px solid #ccc';
    tableContainer.style.margin = '0';

    const ths = table.querySelectorAll('th');
    ths.forEach(th => {
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.backgroundColor = '#f2f2f2';
    });

    const tds = table.querySelectorAll('td');
    tds.forEach(td => {
        td.style.border = '1px solid #ccc';
        td.style.padding = '8px';
    });

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index % 2 === 0) {
            row.style.backgroundColor = '#f9f9f9';
        }
    });

    // Apply current font size and family to table
    table.style.fontSize = fontSizes[currentFontSizeIndex];
    table.style.fontFamily = fontFamilies[currentFontFamilyIndex];

    tableContainer.appendChild(table);
    lessonDisplay.appendChild(tableContainer);

    // Add three <br> elements for spacing
    for (let i = 0; i < 3; i++) {
        lessonDisplay.appendChild(document.createElement('br'));
    }
}


function initializeLanguageSelector() {
    const selectorContainer = document.createElement('div');
    selectorContainer.style.margin = '10px 0';
    selectorContainer.style.width = '90%';
    selectorContainer.style.marginLeft = '0';
    selectorContainer.style.marginRight = 'auto';

    const label = document.createElement('label');
    label.setAttribute('for', 'language-selector');
    label.style.marginRight = '0px';
    label.style.fontSize = '16px';
    selectorContainer.appendChild(label);

    const select = document.createElement('select');
    select.id = 'language-selector';
    select.style.fontSize = '16px';

    availableLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        if (lang === secondLanguage) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    selectorContainer.appendChild(select);
    titleElement.parentElement.insertBefore(selectorContainer, titleElement.nextSibling);

    select.addEventListener('change', function() {
        secondLanguage = this.value;
        saveCurrentSettings();
        displayLesson();
    });
}

function removeDynamicSentenceDisplay() {
    const nextSnippetLandscape = document.getElementById('next-snippet-landscape');
    const lastSnippetLandscape = document.getElementById('last-snippet-landscape');

    if (nextSnippetLandscape) {
        nextSnippetLandscape.removeEventListener('click', playCurrentSnippet);
        nextSnippetLandscape.disabled = true;
    }

    if (lastSnippetLandscape) {
        lastSnippetLandscape.removeEventListener('click', playCurrentSnippet);
        lastSnippetLandscape.disabled = true;
    }
}

function playCurrentSnippet() {
    // No longer used
}

// Font Size Toggle
if (fontToggleButton) {
    fontToggleButton.addEventListener('click', function() {
        currentFontSizeIndex = (currentFontSizeIndex + 1) % fontSizes.length;
        const selectedFontSize = fontSizes[currentFontSizeIndex];
        document.body.style.fontSize = selectedFontSize;
        const lessonTable = document.getElementById('lesson-table');
        if (lessonTable) {
            lessonTable.style.fontSize = selectedFontSize;
        } else {
            console.warn('Lesson table not found.');
        }
        saveCurrentSettings();
    });
}

// Add "S" Button for Font Family Toggle
if (fontToggleButton) {
    const styleToggleButton = document.createElement('button');
    styleToggleButton.className = 'button';
    styleToggleButton.id = 'style-toggle';
    styleToggleButton.title = 'Toggle Font Family';
    styleToggleButton.setAttribute('aria-label', 'Toggle Font Family');
    styleToggleButton.textContent = 'S';
    fontToggleButton.parentNode.insertBefore(styleToggleButton, fontToggleButton.nextSibling);
}

const styleToggleButton = document.getElementById('style-toggle');

if (styleToggleButton) {
    styleToggleButton.addEventListener('click', function() {
        toggleFontFamily();
    });
    styleToggleButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        toggleFontFamily();
    });
}

function toggleFontFamily() {
    if (toggleFontFamily.isDebouncing) return;
    toggleFontFamily.isDebouncing = true;
    setTimeout(() => { toggleFontFamily.isDebouncing = false; }, 300);

    currentFontFamilyIndex = (currentFontFamilyIndex + 1) % fontFamilies.length;
    const selectedFontFamily = fontFamilies[currentFontFamilyIndex];
    document.body.style.fontFamily = selectedFontFamily;
    const lessonTable = document.getElementById('lesson-table');
    if (lessonTable) {
        lessonTable.style.fontFamily = selectedFontFamily;
    } else {
        console.warn('Lesson table not found.');
        alert('Lesson table is not available. Please try again.');
    }

    saveCurrentSettings();
}

removeDynamicSentenceDisplay();

// Night mode toggle
nightModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('night-mode');
    updateModalStyles();
    if (document.body.classList.contains('night-mode')) {
        nightModeToggle.textContent = '☀️';
    } else {
        nightModeToggle.textContent = '🌙';
    }
    applyThemeToIframe();
});

function updateModalStyles() {
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(modal => {
        if (document.body.classList.contains('night-mode')) {
            modal.style.backgroundColor = '#1e1e1e';
            modal.style.color = '#e0e0e0';
        } else {
            modal.style.backgroundColor = '#fff';
            modal.style.color = '#333';
        }
    });
}

function applyThemeToIframe() {
    // Not used
}

let isManualToggle = false;
let currentMode = 'standard';

function toggleMode() {
    // Landscape mode disabled in this scenario
}
function toggleLandscapeMode(isLandscape) {}
function switchToLandscapeMode() {}
function switchToStandardModeAuto() {}
function handleOrientationChange() {}

function handleLooping() {
    if (!currentLoopSnippet) return;
    if (audioElement.currentTime >= currentLoopSnippet.end) {
        audioElement.pause();
        
        const pauseDuration = pauseDurations[currentPauseIndex];
        if (pauseDuration > 0) {
            setTimeout(() => {
                audioElement.currentTime = currentLoopSnippet.start;
                audioElement.play();
            }, pauseDuration);
        } else {
            audioElement.currentTime = currentLoopSnippet.start;
            audioElement.play();
        }

        updateSnippetCounterDisplay();
    }
}

function enterLoopMode() {
    if (snippets.length === 0 || !currentLesson) {
        alert('No snippets available to loop.');
        contLoopToggle.disabled = true; 
        return;
    }

    const currentTime = audioElement.currentTime;
    let snippetIndex = findSnippetIndexByTime(currentTime);
    if (snippetIndex === -1) {
        let closestSnippet = snippets.reduce((prev, curr) => {
            return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
        }, snippets[0]);
        currentLoopSnippet = closestSnippet;
    } else {
        currentLoopSnippet = snippets[snippetIndex];
    }

    modeIndicator.classList.remove('continuous');
    modeIndicator.classList.add('loop');
    contLoopToggle.textContent = 'Loop';

    audioElement.removeEventListener('timeupdate', handleLooping);
    audioElement.addEventListener('timeupdate', handleLooping);

    updateSnippetCounterDisplay();
}

function exitLoopMode() {
    currentLoopSnippet = null;
    modeIndicator.classList.remove('loop');
    modeIndicator.classList.add('continuous');
    contLoopToggle.textContent = 'Cont.';
    audioElement.removeEventListener('timeupdate', handleLooping);
    updateSnippetCounterDisplay();
}

contLoopToggle.addEventListener('click', function() {
    if (!isLoopMode) {
        isLoopMode = true;
        enterLoopMode();
    } else {
        isLoopMode = false;
        exitLoopMode();
    }
    saveCurrentSettings();
});

function updateSnippetCounterDisplay() {
    if (!snippetCounterButton) return;
    const total = snippets.length;
    if (total === 0) {
        snippetCounterButton.textContent = "0/0";
        return;
    }

    if (!isLoopMode || !currentLoopSnippet) {
        snippetCounterButton.textContent = `0/${total}`;
    } else {
        const currentIndex = snippets.indexOf(currentLoopSnippet);
        const snippetNumber = (currentIndex === -1) ? 1 : (currentIndex + 1);
        snippetCounterButton.textContent = `${snippetNumber}/${total}`;
    }
}

playPauseButton.addEventListener('click', function() {
    if (!currentAudioFile) {
        alert('Please load an audio file first.');
        return;
    }
    if (isPlaying) {
        audioElement.pause();
        playPauseButton.textContent = '▶';
        isPlaying = false;
    } else {
        audioElement.play().then(() => {
            isPlaying = true;
            playPauseButton.textContent = '⏸';
        }).catch(error => {
            console.error('Playback failed:', error);
            alert('Unable to play the audio. Please try again.');
        });
    }
});

function findSnippetIndexByTime(time) {
    for (let i = 0; i < snippets.length; i++) {
        if (time >= snippets[i].start && time <= snippets[i].end) {
            return i;
        }
    }
    return -1;
}

function setCurrentLoopSnippet(index) {
    if (index < 0 || index >= snippets.length) return;
    currentLoopSnippet = snippets[index];
    audioElement.currentTime = currentLoopSnippet.start;
    audioElement.play();
    isPlaying = true;
    playPauseButton.textContent = '⏸';
    updateSnippetCounterDisplay();
}

nextSnippetButton.addEventListener('click', function() {
    if (snippets.length === 0) {
        alert('No snippets available.');
        return;
    }

    if (isLoopMode && currentLoopSnippet) {
        let currentIndex = snippets.indexOf(currentLoopSnippet);
        if (currentIndex === -1) currentIndex = 0; 
        let nextIndex = (currentIndex + 1) % snippets.length;
        setCurrentLoopSnippet(nextIndex);
    } else {
        let snippetIndex = findSnippetIndexByTime(audioElement.currentTime);
        if (snippetIndex === -1) {
            let currentTime = audioElement.currentTime;
            let closestSnippet = snippets.reduce((prev, curr) => {
                return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
            }, snippets[0]);
            currentLoopSnippet = closestSnippet;
        } else {
            currentLoopSnippet = snippets[snippetIndex];
        }

        isLoopMode = true;
        modeIndicator.classList.remove('continuous');
        modeIndicator.classList.add('loop');
        contLoopToggle.textContent = 'Loop';
        audioElement.removeEventListener('timeupdate', handleLooping);
        audioElement.addEventListener('timeupdate', handleLooping);

        audioElement.currentTime = currentLoopSnippet.start;
        audioElement.play();
        isPlaying = true;
        playPauseButton.textContent = '⏸';
        updateSnippetCounterDisplay();
    }
    saveCurrentSettings();
});

lastSnippetButton.addEventListener('click', function() {
    if (snippets.length === 0) {
        alert('No snippets available.');
        return;
    }

    if (isLoopMode && currentLoopSnippet) {
        let currentIndex = snippets.indexOf(currentLoopSnippet);
        if (currentIndex === -1) currentIndex = 0;
        let prevIndex = (currentIndex - 1 + snippets.length) % snippets.length;
        setCurrentLoopSnippet(prevIndex);
    } else {
        let snippetIndex = findSnippetIndexByTime(audioElement.currentTime);
        if (snippetIndex === -1) {
            let currentTime = audioElement.currentTime;
            let closestSnippet = snippets.reduce((prev, curr) => {
                return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
            }, snippets[0]);
            currentLoopSnippet = closestSnippet;
        } else {
            currentLoopSnippet = snippets[snippetIndex];
        }

        isLoopMode = true;
        modeIndicator.classList.remove('continuous');
        modeIndicator.classList.add('loop');
        contLoopToggle.textContent = 'Loop';
        audioElement.removeEventListener('timeupdate', handleLooping);
        audioElement.addEventListener('timeupdate', handleLooping);

        audioElement.currentTime = currentLoopSnippet.start;
        audioElement.play();
        isPlaying = true;
        playPauseButton.textContent = '⏸';
        updateSnippetCounterDisplay();
    }
    saveCurrentSettings();
});

rewind3Button.addEventListener('click', function() {
    if (audioElement.duration && !isNaN(audioElement.duration)) {
        audioElement.currentTime = Math.max(audioElement.currentTime - 3, 0);
    }
});

forward3Button.addEventListener('click', function() {
    if (audioElement.duration && !isNaN(audioElement.duration)) {
        audioElement.currentTime = Math.min(audioElement.currentTime + 3, audioElement.duration);
    }
});

// Speed Toggle Buttons
if (speedToggleButton) {
    speedToggleButton.addEventListener('click', function() {
        currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
        playbackSpeed = playbackSpeeds[currentSpeedIndex];
        audioElement.playbackRate = playbackSpeed;
        speedToggleButton.textContent = `${playbackSpeed.toFixed(2)}x`;
        if (speedToggleLandscapeButton) {
            speedToggleLandscapeButton.textContent = `${playbackSpeed.toFixed(2)}x`;
        }
        saveCurrentSettings();
    });
}

if (speedToggleLandscapeButton) {
    speedToggleLandscapeButton.addEventListener('click', function() {
        currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
        playbackSpeed = playbackSpeeds[currentSpeedIndex];
        audioElement.playbackRate = playbackSpeed;
        speedToggleLandscapeButton.textContent = `${playbackSpeed.toFixed(2)}x`;
        if (speedToggleButton) {
            speedToggleButton.textContent = `${playbackSpeed.toFixed(2)}x`;
        }
        saveCurrentSettings();
    });
}

// Pause Toggle Button Functionality
if (pauseToggleButton) {
    pauseToggleButton.addEventListener('click', function() {
        currentPauseIndex = (currentPauseIndex + 1) % pauseDurations.length;
        const duration = pauseDurations[currentPauseIndex];

        let displayText;
        switch (duration) {
            case 0:
                displayText = "P0";
                break;
            case 1000:
                displayText = "P1";
                break;
            case 2000:
                displayText = "P2";
                break;
            case 3000:
                displayText = "P3";
                break;
             case 4000:
                displayText = "P4";
                break;
       }
        pauseToggleButton.textContent = displayText;
    });
}

// Show/Hide Modal Functions
function showInitialModal() {
    initialModal.style.display = 'block';
}

function hideInitialModal() {
    initialModal.style.display = 'none';
}

audioFileButton.addEventListener('click', function(event) {
    event.preventDefault();
    showInitialModal();
});

closeInitialModalButton.addEventListener('click', hideInitialModal);

window.addEventListener('click', function(event) {
    if (event.target === initialModal) {
        hideInitialModal();
    }
});

window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && initialModal.style.display === 'block') {
        hideInitialModal();
    }
});

// Load Selected MP3 from Modal
loadSelectedMp3Button.addEventListener('click', function() {
    if (initialFileInput.files && initialFileInput.files[0]) {
        const file = initialFileInput.files[0];
        const fileURL = URL.createObjectURL(file);
        loadAudioFile(fileURL, file.name);
    } else {
        const selectedUrl = serverMp3List.value;
        if (selectedUrl) {
            loadAudioFile(selectedUrl, selectedUrl);
        } else {
            alert('Please select an MP3 file from local drive or from the list.');
        }
    }
});

function loadAudioFile(src, name) {
    audioElement.src = src;
    currentAudioFile = name;
    audioElement.loop = true;

    const { fullBaseName, baseName } = extractBaseName(name);
    audioFileNameDisplay.textContent = fullBaseName; 

    if (!baseName) {
        alert('Audio file is incorrect. Please use a correct format like "Creole001.ext".');
        audioFileNameDisplay.textContent = 'No audio file loaded.';
        snippets = [];
        audioElement.loop = false;
        saveSnippetsToLocalStorage(currentAudioFile, snippets);
        updateSnippetCounterDisplay();
        lessonDisplay.innerHTML = '';
        return;
    }

    let localSnips = loadSnippetsFromLocalStorage(currentAudioFile);

    if (localSnips.length > 0) {
        snippets = localSnips;
    } else {
        snippets = loadSnippetsFromData(baseName);
        saveSnippetsToLocalStorage(currentAudioFile, snippets);
    }

    currentLesson = findLessonByIdentifier(baseName);

    if (!currentLesson) {
        alert('Click the red audio button (MP3) and load an audio.');
        audioFileNameDisplay.textContent = 'No audio file loaded.';
        snippets = [];
        audioElement.loop = false;
        saveSnippetsToLocalStorage(currentAudioFile, snippets);
        updateSnippetCounterDisplay();
        lessonDisplay.innerHTML = '';
        return;
    }

    displayLesson();
    snippets.sort((a, b) => a.start - b.start);
    saveSnippetsToLocalStorage(currentAudioFile, snippets);
    updateSnippetCounterDisplay();

    applySettings(); // Ensure font size, family, and language are applied after loading a new file

    // Store the currentAudioFile as lastPlayedAudio in localStorage
    localStorage.setItem('lastPlayedAudio', src);

    audioElement.play()
        .then(() => {
            isPlaying = true;
            playPauseButton.textContent = '⏸';
        })
        .catch(error => {
            console.error('Autoplay was prevented:', error);
            playPauseButton.textContent = '▶';
        });

    hideInitialModal();
}

window.addEventListener('load', function() {
    const settings = loadSettingsFromLocalStorage();

    if (settings.secondLanguage && availableLanguages.includes(settings.secondLanguage)) {
        secondLanguage = settings.secondLanguage;
    }

    if (typeof settings.fontSizeIndex === 'number' && settings.fontSizeIndex < fontSizes.length) {
        currentFontSizeIndex = settings.fontSizeIndex;
    } else {
        currentFontSizeIndex = 0;
    }

    if (typeof settings.fontFamilyIndex === 'number' && settings.fontFamilyIndex < fontFamilies.length) {
        currentFontFamilyIndex = settings.fontFamilyIndex;
    } else {
        currentFontFamilyIndex = 0;
    }

    initializeLanguageSelector();
    applySettings(); // Apply saved settings on page load

    updateSnippetCounterDisplay();

    if (isLoopMode) {
        modeIndicator.classList.remove('continuous');
        modeIndicator.classList.add('loop');
        contLoopToggle.textContent = 'Loop';
    } else {
        modeIndicator.classList.remove('loop');
        modeIndicator.classList.add('continuous');
        contLoopToggle.textContent = 'Cont.';
    }

    // Attempt to load last played audio from localStorage, otherwise load default firstAudio
    let lastPlayedAudio = localStorage.getItem('lastPlayedAudio');
    if (lastPlayedAudio) {
        // Try loading the last played audio
        loadAudioFile(lastPlayedAudio, lastPlayedAudio);
    } else {
        // Load the default firstAudio defined in creole_txt.js
        loadAudioFile(firstAudio, firstAudio);
    }

    titleElement.addEventListener('click', toggleMode);
});

window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', handleOrientationChange);

// Image Enlarger Functionality
(function() {
    const headerContainer = document.getElementById('headerImageContainer');
    const headerImage = document.getElementById('headerImage');
    const imageOverlay = document.getElementById('imageOverlay');
    const enlargedImage = document.getElementById('enlargedImage');

    function openOverlay(src, alt) {
        enlargedImage.src = src;
        enlargedImage.alt = alt || 'Enlarged Image';
        imageOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
        imageOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    headerContainer.addEventListener('click', () => {
        openOverlay(headerImage.src, headerImage.alt);
    });

    imageOverlay.addEventListener('click', (e) => {
        if (e.target === imageOverlay || e.target === enlargedImage) {
            closeOverlay();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageOverlay.classList.contains('active')) {
            closeOverlay();
        }
    });
})();
