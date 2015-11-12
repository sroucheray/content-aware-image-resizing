'use strict';
var assert = chai.assert;
describe('LiquidImage', function() {
    describe('#constructor', function() {
        it('throws when not passing an Image', function() {
            assert.throw(function(){
                new LiquidImage();
            }, 'image must be an instance of Image');
        });

        it('originalWidth & originalHeight retain image size', function(done) {
            mock.getImageFormat({
                width: 300,
                height: 200,
                color: '000'
            }, function(image){
                var liquidImage = new LiquidImage(image);
                assert.equal(300, liquidImage.originalWidth);
                assert.equal(200, liquidImage.originalHeight);
                done();
            })
        });

        it('grey worker is created', function(done) {
            mock.getImage(function(image){
                var liquidImage = new LiquidImage(image);
                assert.instanceOf(liquidImage.workers.grey, Worker);
                done();
            })
        });
    });
});