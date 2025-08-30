import os
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS # Import CORS

app = Flask(__name__, static_folder=None)
CORS(app) # Enable CORS for all routes

# Replace with your actual Gemini API Key from Google AI Studio.
# It's best practice to use environment variables for security.
# For this example, we keep it here as per your request.
API_KEY = "AIzaSyCKNL1QF-TLhUivyZoU1v5RxUj0S1J66UQ"
genai.configure(api_key=API_KEY)

# Available Gemini models with descriptions
# This dictionary contains both available and potentially future models with their details.
AVAILABLE_MODELS = {
    # Stable and Recommended (ব্যবহার করার জন্য উপযুক্ত)
    "gemini-2.5-pro": {
        "name": "Gemini 2.5 Pro",
        "description": "সবথেকে ভালো ও শক্তিশালী।",
        "speed": "Standard",
        "category": "Stable and Recommended"
    },
    "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash",
        "description": "দ্রুত এবং সাশ্রয়ী, আদর্শ পছন্দ।",
        "speed": "Fastest",
        "category": "Stable and Recommended"
    },
    "gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro",
        "description": "নির্ভরযোগ্য এবং বহুমুখী।",
        "speed": "Standard",
        "category": "Stable and Recommended"
    },
    "gemini-1.5-flash": {
        "name": "Gemini 1.5 Flash",
        "description": "দ্রুত গতির জন্য ভালো।",
        "speed": "Fastest",
        "category": "Stable and Recommended"
    },
    "gemini-2.5-flash-lite": {
        "name": "Gemini 2.5 Flash Lite",
        "description": "সবচেয়ে হালকা এবং সম্ভবত দ্রুততম মডেল। অত্যন্ত দ্রুত প্রতিক্রিয়া প্রয়োজন এমন ক্ষুদ্র কাজের জন্য।",
        "speed": "Fastest",
        "category": "Stable and Recommended"
    },

    # Preview and Best-in-Class (প্রিভিউ, কিন্তু খুবই ভালো)
    "gemini-2.5-pro-preview-tts": {
        "name": "Gemini 2.5 Pro TTS",
        "description": "TTS (Text-to-Speech)-এর জন্য সেরা।",
        "speed": "Standard",
        "category": "Preview and Best-in-Class"
    },
    "gemini-2.5-flash-preview-tts": {
        "name": "Gemini 2.5 Flash TTS",
        "description": "দ্রুত TTS-এর জন্য।",
        "speed": "Fast",
        "category": "Preview and Best-in-Class"
    },
    "gemini-2.5-flash-image-preview": {
        "name": "Gemini 2.5 Flash Image Preview",
        "description": "ইমেজের কাজের জন্য।",
        "speed": "Fast",
        "category": "Preview and Best-in-Class"
    },
    "gemini-live-2.5-flash-preview": {
        "name": "Gemini Live 2.5 Flash Preview",
        "description": "রিয়েল-টাইম ইন্টারেকশনের জন্য।",
        "speed": "Fast",
        "category": "Preview and Best-in-Class"
    },
    "gemini-2.5-flash-preview-native-audio-dialog": {
        "name": "Gemini 2.5 Flash Native Audio",
        "description": "অডিও ভিত্তিক ডায়ালগ বা কথোপকথনের জন্য বিশেষায়িত দ্রুত মডেল।",
        "speed": "Fast",
        "category": "Preview and Best-in-Class"
    },

    # Experimental or Unstable (পরীক্ষামূলক ও অনির্ভরযোগ্য)
    "gemini-2.5-flash-exp-native-audio-thinking-dialog": {
        "name": "Gemini 2.5 Flash Audio (Experimental)",
        "description": "\"Experimental\" বা পরীক্ষামূলক।",
        "speed": "Fast",
        "category": "Experimental or Unstable"
    },
    "gemini-2.0-flash-preview-image-generation": {
        "name": "Gemini 2.0 Flash Image Gen",
        "description": "পুরনো ভার্সন ও পরীক্ষামূলক।",
        "speed": "Fast",
        "category": "Experimental or Unstable"
    },
    "gemini-2.0-flash-live-001": {
        "name": "Gemini 2.0 Flash Live",
        "description": "পুরনো ভার্সন।",
        "speed": "Fast",
        "category": "Experimental or Unstable"
    },
    "gemini-1.5-flash-8b": {
        "name": "Gemini 1.5 Flash 8B",
        "description": "একটি পরীক্ষামূলক ও হালকা ভার্সন।",
        "speed": "Fast",
        "category": "Experimental or Unstable"
    },
    "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "description": "দ্রুত এবং সাশ্রয়ী মডেলের পূর্ববর্তী সংস্করণ।",
        "speed": "Fast",
        "category": "Experimental or Unstable"
    },
    "gemini-2.0-flash-lite": {
        "name": "Gemini 2.0 Flash Lite",
        "description": "দ্রুততম মডেলের পূর্ববর্তী সংস্করণ।",
        "speed": "Fastest",
        "category": "Experimental or Unstable"
    }
}

@app.route('/generate/<string:model_id>', methods=['POST'])
def generate_text(model_id):
    data = request.get_json()
    prompt = data.get('prompt')
    history = data.get('history', [])

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    if model_id not in AVAILABLE_MODELS:
        return jsonify({"error": f"Invalid model specified. Available models are: {', '.join(AVAILABLE_MODELS.keys())}"}), 400

    try:
        model = genai.GenerativeModel(model_id)
        chat = model.start_chat(history=history)
        response = chat.send_message(prompt)

        # Basic markdown to HTML conversion (as in the original code)
        formatted_output = []
        for part in response.parts:
            text = part.text
            if text.startswith('**') and text.endswith('**'):
                formatted_output.append(f"<b>{text[2:-2]}</b>")
            elif text.startswith('```') and text.endswith('```'):
                formatted_output.append(f"<pre><code>{text[3:-3].strip()}</code></pre>")
            else:
                formatted_output.append(text)

        return jsonify({"output": "\n".join(formatted_output)}), 200

    except Exception as e:
        app.logger.error(f"Error generating content for model {model_id} with prompt '{prompt}': {e}")
        return jsonify({"error": "An internal server error occurred. Please check server logs for details."}), 500

@app.route('/models', methods=['GET'])
def get_models():
    return jsonify(AVAILABLE_MODELS)

@app.route('/')
def index():
    return send_from_directory('.', 'api_index.html')

@app.route('/chat')
def chat():
    return send_from_directory('.', 'chat.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)
