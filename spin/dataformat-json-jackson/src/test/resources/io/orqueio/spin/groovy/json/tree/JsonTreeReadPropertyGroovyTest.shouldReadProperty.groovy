package io.orqueio.spin.groovy.json.tree

node = S(input, "application/json")
property = node.prop("order")
value = property.stringValue()
