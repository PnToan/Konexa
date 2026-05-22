import { reactive, readonly } from 'vue'

export function createSimpleStore(initialState, actionsFactory) {
  const state = reactive(initialState)
  const actions = actionsFactory ? actionsFactory(state) : {}
  return {
    state,
    readonlyState: readonly(state),
    ...actions
  }
}
