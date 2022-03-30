import time

class PetriPlace:
    def __init__(self, net, data) -> None:
        self.net = net
        self.name = data['name']
        self.type = data['type']
        self.initialMark = int(data['initialMark'])
        self.mark = self.initialMark
    
    def __repr__(self) -> str:
        return f"Place({self.name}, {self.type})"
    
    def have(self, val):
        return self.mark >= val
    
    def send(self, val):
        self.mark -= val

    def recive(self, val):
        if self.type == 'BOOL':
            self.mark = 1
            return
        self.mark += val

class PetriArc:
    def __init__(self, net, data) -> None:
        self.net = net
        self.weight = int(data['weight'])
        self.type = data['type']
        self.placeId = data['placeId']
        self.transId = data['transId']
        self.place = net.places[self.placeId]

    def have(self):
        if self.type == 'inhibitor':
            return not self.place.have(self.weight)
        else:
            return self.place.have(self.weight)

    def send(self):
        self.place.send(self.weight)

    def recive(self):
        self.place.recive(self.weight)

class PetriTrans:
    def __init__(self, net, data) -> None:
        self.net = net
        self.name = data['name']
        self.arcIds = data['arcs']
        try:
            self.time = float(data['time'])
        except:
            self.time = 0
        self.guard = data['guard'].strip()
        self._time_to_enable = self.time

        self.inputs = [PetriArc(self.net, self.net.elements[arc_id]) 
                for arc_id in self.arcIds 
                if self.net.elements[arc_id]['type'] == 'input']

        self.outputs = [PetriArc(self.net, self.net.elements[arc_id]) 
                for arc_id in self.arcIds 
                if self.net.elements[arc_id]['type'] == 'output']

        self.test_arcs = [PetriArc(self.net, self.net.elements[arc_id]) 
                for arc_id in self.arcIds 
                if self.net.elements[arc_id]['type'] == 'test']

        self.inhibitor_arcs = [PetriArc(self.net, self.net.elements[arc_id]) 
                for arc_id in self.arcIds 
                if self.net.elements[arc_id]['type'] == 'inhibitor']
    
    def __repr__(self) -> str:
        return f"Trans({self.name}, {self.arcIds})"
    
    def enabled(self, delta_time):
        for arc in self.inputs + self.test_arcs + self.inhibitor_arcs:
            if not arc.have():
                return False
        if self.guard:
            if not eval(self.guard, self.net.context.copy()):
                return False
        if self._time_to_enable > 0:
            self._time_to_enable -= delta_time
            return False
        
        self._time_to_enable = self.time
        return True

    def fire(self):
        for arc in self.inputs:
            arc.send()
        for arc in self.outputs:
            arc.recive()
        self._time_to_enable = self.time

class PetriNet:
    def __init__(self, data) -> None:
        self.elements = data['elements']
        sim_modes = {
            '1': self.step1,
            '2': self.step2,
            '3': self.step3
        }
        self.simModeStep = sim_modes.get(data['simMode'], self.step1)

        self.context = data['inputs'].copy()
        self.context['_memory'] = data['inputs'].copy()
        
        exec("ft = lambda varname: _memory[varname] and (not globals()[varname])", self.context)
        exec("rt = lambda varname: (not _memory[varname]) and globals()[varname]", self.context)

        self.pre_script = data['preScript'].strip()

        self.places = {key: PetriPlace(self, val) 
                for key, val in self.elements.items()
                if val['PNElementType'] == 'place'}

        self.transitions = {key: PetriTrans(self, val) 
                for key, val in self.elements.items()
                if val['PNElementType'] == 'trans'}
        
    def current_state(self):
        return {placeId: place.mark for placeId, place in self.places.items()}
    
    def step(self):
        if self.pre_script:
                exec(self.pre_script, self.context)
        self.simModeStep()
        for varname in self.context['_memory']:
            self.context['_memory'][varname] = self.context[varname]

    def step1(self):
        for trans in self.transitions.values():
            if trans.enabled(0.2):
                trans.fire()
                print('fired ', trans.name)
                return
    
    def step2(self):
        for trans in self.transitions.values():
            if trans.enabled(0.2):
                trans.fire()
                print('fired ', trans.name)

    def step3(self):
        enabled_transitions = [trans for trans in self.transitions.values()
                if trans.enabled(0.2)]
        for trans in enabled_transitions:
            if trans.enabled(0.2):
                trans.fire()
                print('fired ', trans.name)
    
    def update_inputs(self, inputs_to_update):
        self.context.update(inputs_to_update)
        print(self.context)

    def __repr__(self) -> str:
        return str({'places': self.places, 'transitions': self.transitions})

if __name__ == "__main__":
    net = PetriNet({'PE1': {'PNElementType': 'place', 'name': 'p1', 'type': 'INT', 'initialMark': '1'}, 'PE2': {'PNElementType': 'place', 'name': 'p2', 'type': 'INT', 'initialMark': 0}, 'PE3': {'PNElementType': 'place', 'name': 'p3', 'type': 'INT', 'initialMark': 0}, 'PE4': {'PNElementType': 'trans', 'name': 't1', 'arcs': ['PE6', 'PE7', 'PE8']}, 'PE5': {'PNElementType': 'trans', 'name': 't2', 'arcs': ['PE9', 'PE10']}, 'PE6': {'PNElementType': 'arc', 'type': 'input', 'weight': 1, 'placeId': 'PE1', 'transId': 'PE4'}, 'PE7': {'PNElementType': 'arc', 'type': 'output', 'weight': 1, 'placeId': 'PE2', 'transId': 'PE4'}, 'PE8': {'PNElementType': 'arc', 'type': 'output', 'weight': 1, 'placeId': 'PE3', 'transId': 'PE4'}, 'PE9': {'PNElementType': 'arc', 'type': 'input', 'weight': 1, 'placeId': 'PE3', 'transId': 'PE5'}, 'PE10': {'PNElementType': 'arc', 'type': 'output', 'weight': 1, 'placeId': 'PE1', 'transId': 'PE5'}})

    print(net.places, net.transitions)

    for _ in range(10):
        net.step()
        print(net.current_state())