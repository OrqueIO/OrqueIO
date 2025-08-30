map = {
  "a" => "http://orqueio.io"
}

$query = S($input).xPath($expression).ns(map)
