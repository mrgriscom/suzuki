from pygame import midi
import threading
import time

midi.init()

class MIDIDevice(threading.Thread):
    def __init__(self, interface_name):
        threading.Thread.__init__(self)

        self.init_hardware(interface_name)
        self.subscribers = []

        self.lock = threading.Lock()
        self.up = True

    def init_hardware(self, interface_name):
        input_id, output_id = get_devices(interface_name)
        if input_id is None or output_id is None:
            raise IOError
        self.input = midi.Input(input_id)
        self.output = midi.Output(output_id)

    def destroy_hardware(self):
        self.input.close()
        self.output.close()

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

    def do_action(self, func):
        func(self.output)

    def get_events(self):
        buf = self.input.read(1000)
        return filter(None, (parse_event(e) for e in buf))

    def run(self):
        while self.up:
            events = self.get_events()
            if events:
                self.broadcast(events)
            time.sleep(0.01)

        self.destroy_hardware()

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
    id_in, id_out = None, None
    for i in range(midi.get_count()):
        info = midi.get_device_info(i)
        if info[1] == name:
            if info[2]:
                id_in = i
            elif info[3]:
                id_out = i
    return id_in, id_out
