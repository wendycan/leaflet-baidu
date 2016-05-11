var _translatePoint = function (originalPoint) {
  var i = 0;
  return new Promise(function(resolve, reject){
    var baiduPoint;
    var flag;
    var convertor = new BMap.Convertor();
    convertor.translate([originalPoint], 1, 5, function(data){
        baiduPoint = data.status === 0 ? data.points[0] : null;
        resolve(baiduPoint);
    });
  });
};

async function translatePoint(originalPoint){
  var data = await _translatePoint(originalPoint);
  return data;
};

window.translatePoint = translatePoint;
