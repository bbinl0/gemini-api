document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model-select');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatWindow = document.getElementById('chat-window');
    let chatHistory = [];

    // Function to fetch available models from the API and populate the dropdown
    async function fetchModels() {
        try {
            const response = await fetch('/models');
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const models = await response.json();

            modelSelect.innerHTML = '';
            const categories = {};

            for (const modelId in models) {
                const model = models[modelId];
                if (!categories[model.category]) {
                    categories[model.category] = [];
                }
                categories[model.category].push({ id: modelId, ...model });
            }

            // Define the preferred models
            const preferredModels = [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', speed: 'Faster', category: 'Preferred' },
                { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', speed: 'Fastest', category: 'Preferred' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', speed: 'Fast', category: 'Preferred' }
            ];

            // Add preferred models to the top
            const preferredOptgroup = document.createElement('optgroup');
            preferredOptgroup.label = 'Preferred Models';
            preferredModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.name} (${model.speed})`;
                preferredOptgroup.appendChild(option);
            });
            modelSelect.appendChild(preferredOptgroup);

            // Add other models, excluding those already added
            for (const category in categories) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;
                categories[category].forEach(model => {
                    if (!preferredModels.some(pm => pm.id === model.id)) {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = `${model.name} (${model.speed})`;
                        optgroup.appendChild(option);
                    }
                });
                if (optgroup.children.length > 0) {
                    modelSelect.appendChild(optgroup);
                }
            }
            // Set the first preferred model as selected by default
            if (preferredModels.length > 0) {
                modelSelect.value = preferredModels[0].id;
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            const option = document.createElement('option');
            option.textContent = 'Error loading models';
            modelSelect.appendChild(option);
        }
    }

    fetchModels();

    // Handle sending message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const userMessage = messageInput.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user');
        messageInput.value = '';

        const selectedModel = modelSelect.value;
        const apiUrl = `/generate/${selectedModel}`;

        const typingMessage = appendTypingAnimation();
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userMessage,
                    history: chatHistory,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            typingMessage.remove();

            appendFormattedMessage(data.output, 'bot');
            chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.output }] });
        } catch (error) {
            console.error('Error fetching data:', error);
            typingMessage.remove();
            appendMessage('দুঃখিত, কোনো ত্রুটি হয়েছে।', 'bot');
        }
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageDiv;
    }

    function appendTypingAnimation() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-dots');
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return typingDiv;
    }

    function appendFormattedMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // The key is to handle different types of content sequentially
        let htmlContent = text;

        // 1. Process multi-line code blocks
        htmlContent = htmlContent.replace(/```([\s\S]*?)```/g, (match, code) => {
            // Escape HTML characters to prevent injection
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const copyButton = `<button class="copy-button" onclick="copyCode(this)">কপি</button>`;
            return `<pre style="background-color: white; padding-top: 40px;">${copyButton}<div class="code-content"><code>${escapedCode.trim()}</code></div></pre>`;
        });

        // 2. Process inline code (before other formatting to avoid conflicts)
        htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 3. Process bold text
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 4. Process italic text
        htmlContent = htmlContent.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        htmlContent = htmlContent.replace(/_([^_]+)_/g, '<em>$1</em>');

        // 5. Process lists (this requires a bit of state or more complex regex)
        // A simpler but effective way is to replace newlines with <br> and then handle lists with CSS.
        // Or, for a better solution, you can use a library. Let's simplify this part for now.
        // A simple approach is to replace markdown lists with HTML list tags.
        htmlContent = htmlContent.replace(/^\s*\*\s(.+)/gm, '<li>$1</li>');
        htmlContent = `<ul>${htmlContent}</ul>`;
        htmlContent = htmlContent.replace(/<\/ul><ul>/g, ''); // Merge consecutive lists

        // 6. Replace single newlines with <br> tags
        htmlContent = htmlContent.replace(/\n/g, '<br>');

        messageDiv.innerHTML = htmlContent;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // This function is fine as is
    window.copyCode = function(button) {
        const codeElement = button.nextElementSibling;
        const codeToCopy = codeElement.textContent;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            button.textContent = 'কপি হয়েছে!';
            setTimeout(() => {
                button.textContent = 'কপি';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
});
