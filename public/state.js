// Default state
export let state = {
    motor: null,
    water: null,
    isCommandPending: false,
};

export function setState(newState) {
    state = { ...state, ...newState };
}

export function setCommandPending(isPending) {
    state.isCommandPending = isPending;
}