describe("PetFinder to Firebase Test", function(){
	describe("GET /", function() {
		it("return status code 200", function(done) {
			request.get(base_url, function(error, response, body) {
				assert.equal(200, response.statusCode);
				done();
			});
		});
	});
});