from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/generate_prompt', methods=['POST'])
def generate_prompt():
    data = request.json
    file_name = data.get('file_name', 'archivo desconocido')
    return jsonify({"prompt": f"Escribe un test para {file_name}"})

if __name__ == '__main__':
    app.run(port=5000)
