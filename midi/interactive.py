from pygame import midi
import threading

midi.init()

class MIDIDevice(threading.Thread):
    def __init__(self, interface_name):
        threading.Thread.__init__(self)

        device_ids = get_devices(interface_name)
        self.input = midi.Input(device_ids['input'])
        self.output = midi.Output(device_ids['output'])
        self.subscribers = []

        self.lock = threading.Lock()
        self.up = True

    def terminate(self):
        self.up = False

    def subscribe(self, sub):
        with self.lock:
            self.subscribers.append(sub)

    def unsubscribe(self, sub):
        with self.lock:
            self.subscribers.remove(sub)

    def broadcast(self, msg):
        with self.lock:
            for sub in self.subscribers:
                sub.received(msg)

    def run(self):
        while self.up:
            buf = self.input.read(1)
            if buf:
                evt = parse_event(buf[0])
                if evt:
                    self.broadcast(evt)

        self.input.close()
        self.output.close()

def parse_event(raw):
    data, timecode = raw
    try:
        state = {
            0x90: 'on',
            0x80: 'off',
        }[data[0]]
    except KeyError:
        return None
    note = data[1]
    return {'state': state, 'note': note}

def get_devices(name):
    ids = {'input': None, 'output': None}
    for i in range(midi.get_count()):
        device = midi.get_device_info(i)
        if device[1] == name:
            if device[2]:
                ids['input'] = i
            elif device[3]:
                ids['output'] = i
    return ids
