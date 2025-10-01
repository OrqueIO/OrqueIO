DataFormats = Java::IoOrqueioSpin::DataFormats

$json1 = S($input, DataFormats.json())

$json2 = S($input, "application/json")

$json3 = S($input)
