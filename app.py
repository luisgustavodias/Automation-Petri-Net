import json
import os
import subprocess
import sys

from flask import Flask, render_template
from flask_socketio import SocketIO, emit, send

from PetriNet import PetriNet

filetypes = [('Automation Petri Net', '*.apn')]

#import logging
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

app = Flask(__name__)
io = SocketIO(app)#, logger=False)

net = PetriNet({'elements':{}, 'inputs': {}, 'simMode': '1', 'preScript': ''})

@app.route("/")
def home():
    return render_template("index.html")

@io.on('simulate')
def simulate(msg):
    global net

    print('simulate', msg)
    net = PetriNet(msg)
    emit('stepresp', net.current_state())

@io.on('step')
def send_message_handler(msg):
    net.step()
    emit('stepresp', net.current_state())

@io.on('load')
def load(msg):
    print('load')
    result = subprocess.run(
        [sys.executable, '-c', """import tkinter as tk
from tkinter.filedialog import asksaveasfilename, askopenfilename

root = tk.Tk()
root.withdraw()
root.lift()
root.attributes("-topmost", True)

filetypes = [('Automation Petri Net', '*.apn')]

filename = askopenfilename(filetypes = filetypes)
print(filename)"""], 
        capture_output=True, 
        text=True)
    filename = result.stdout.strip()
    if filename:
        with open(filename, 'r', encoding='utf-8') as file:
            json_dict = json.loads(file.read())
        emit('loadresp', json_dict)

@io.on('save')
def save(msg):
    metadata = msg['net']['metadata']
    filename = os.path.join(metadata['filePath'], metadata['fileName'])
    print(filename)
    with open(filename, 'w', encoding='utf-8') as file:
        json.dump(msg, file, ensure_ascii=False, indent=4)
    emit('saveresp', msg)

@io.on('saveas')
def save_as(msg):
    print('save as')
    #filename = save_gui()
    result = subprocess.run(
        [sys.executable, '-c', """import tkinter as tk
from tkinter.filedialog import asksaveasfilename, askopenfilename

root = tk.Tk()
root.withdraw()
root.lift()
root.attributes("-topmost", True)

filetypes = [('Automation Petri Net', '*.apn')]

filename = asksaveasfilename(filetypes = filetypes, defaultextension=".apn")
print(filename)"""], 
        capture_output=True, 
        text=True)
    filename = result.stdout.strip()
    print('filename =',filename)
    if filename:
        metadata = msg['net']['metadata']
        metadata['fileName'] = os.path.basename(filename)
        metadata['filePath'] = os.path.dirname(filename)

        save(msg)

@io.on('updateInput')
def update_input(msg):
    net.update_inputs(msg)

if __name__ == "__main__":
    io.run(app, debug=True)
