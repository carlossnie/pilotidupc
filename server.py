from flask import Flask, request, jsonify, render_template, Response
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import logging
import json

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__, template_folder='templates')
# Configurar CORS correctamente
CORS(app, resources={r"/*": {"origins": "*"}})

# Configurar OpenAI
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error rendering index: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/health')
def health_check():
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        response = {
            "status": "healthy",
            "api_key_configured": bool(api_key),
            "server_status": "running"
        }
        return jsonify(response), 200, {
            'Content-Type': 'application/json'
        }
    except Exception as e:
        logger.error(f"Error en health check: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500, {
            'Content-Type': 'application/json'
        }

@app.route('/generate_fibonacci', methods=['GET', 'POST'])
def generate_fibonacci():
    try:
        logger.debug("Iniciando petición a OpenAI")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a Python programming assistant."},
                {"role": "user", "content": """Generate a complete Python function that:
                1. Calculates the nth Fibonacci number
                2. Uses type hints
                3. Includes error handling
                4. Has docstring
                5. Uses an efficient implementation
                Only return the code, no explanations."""}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        code = response.choices[0].message.content.strip()
        logger.debug(f"Código generado exitosamente: {code[:100]}...")
        
        return jsonify({"code": code})
    
    except Exception as e:
        logger.error(f"Error en generate_fibonacci: {str(e)}", exc_info=True)
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    try:
        if not os.getenv('OPENAI_API_KEY'):
            raise ValueError("OpenAI API key no encontrada en variables de entorno")
        
        # Verificar que existe el directorio templates
        if not os.path.exists('templates'):
            os.makedirs('templates')
            logger.info("Directorio templates creado")
        
        logger.info("Servidor iniciando en puerto 5000...")
        # Permitir conexiones desde cualquier host
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        logger.error(f"Error al iniciar el servidor: {str(e)}")
        raise
