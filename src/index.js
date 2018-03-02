import defaultLog from "./defaultLog"

export default function(options) {
  var dispatchedActionsHistory = []
  options = options || {}
  options.log = typeof options.log === "function" ? options.log : defaultLog

  return function(app) {
    return function(initialState, actionsTemplate, view, container) {
      function enhanceActions(actions, prefix) {
        var namespace = prefix ? prefix + "." : ""
        return Object.keys(actions || {}).reduce(function(otherActions, name) {
          var namedspacedName = namespace + name
          var action = actions[name]
          otherActions[name] =
            typeof action === "function"
              ? function(data) {
                  return function(state, actions) {
                    var result = action(data)
                    result =
                      typeof result === "function"
                        ? result(state, actions)
                        : result

                    dispatchedActionsHistory.push({
                      name: namedspacedName,
                      data: data,
                      namespace:
                        namespace.slice(-1) === "."
                          ? namespace.slice(0, -1)
                          : namespace,
                      state: state,
                      result: result
                    })

                    return result
                  }
                }
              : enhanceActions(action, namedspacedName)
          return otherActions
        }, {})
      }

      function enhanceView(view) {
        return function(state, actions) {
          if (dispatchedActionsHistory.length) {
            dispatchedActionsHistory.forEach(function(actionDetails) {
              options.log(
                actionDetails.state,
                {
                  name: actionDetails.name,
                  data: actionDetails.data,
                  result: actionDetails.result
                },
                actionDetails.namespace
                  .split(".")
                  .reduce(function(nestedState, prop) {
                    return prop ? nestedState[prop] : nestedState
                  }, state)
              )
            })
            dispatchedActionsHistory = []
          }
          return view(state, actions)
        }
      }

      var enhancedActions = enhanceActions(actionsTemplate)
      var enhancedView = enhanceView(view)

      var appActions = app(
        initialState,
        enhancedActions,
        enhancedView,
        container
      )
      return appActions
    }
  }
}
