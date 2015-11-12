var mock = {
    getImageFromURL: function(url, callback) {
        var image = new Image();

        image.addEventListener("load", function() {
            callback.call(image, image);
        }, false);

        image.addEventListener("error", function() {
            console.error('Fail to load', url);
        }, false);

        image.src = url;

        return image;
    },
    getImageFormat: function(format, callback){
        //300x200-000.png
        var url = './images/'
        var extension = '.png';
        return this.getImageFromURL(
            url + format.width + 'x' + format.height + '-' + format.color + extension, callback);
    },
    getImage: function(callback){
        return this.getImageFormat({
            width: 300,
            height: 200,
            color: '000'
        }, callback);
    }
};