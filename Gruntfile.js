module.exports = function(grunt) {


	grunt.initConfig({

		concat: {
			css: {
				src: ['src/css/*.css'],
				dest: 'css/production.css'
			},
			js: {
				src: [
					'src/js/jquery-3.3.1.min.js',
					'src/js/bootstrap.min.js',
					'src/js/twemoji.min.js',
					'src/js/sql.js',
					'src/js/sjcl.js',
					'src/js/codecBytes.js',
					'src/js/pako.min.js',
					'src/js/jquery-filestyle.min.js',
					'src/js/date.format.min.js',
					'src/js/chatmaster.js'
				],
				dest: 'js/production.js'
			}
		},
		uglify: {
			dev: {
				options: {
					mangle: {
						reserved: ['jQuery']
					}
				},
				files: [{
					expand: true,
					src: ['js/production.js'],
					dest: '.',
					cwd: '.',
					rename: function(dst, src) {
						// To keep the source js files and make new files as `*.min.js`:
						//return dst + '/' + src.replace('.js', '.min.js');
						// Or to override to src:
						return src;
					}
				}]
			}
		},
		cssmin: {
			target: {
				files: [{
					expand: true,
					cwd: '.',
					src: ['css/production.css'],
					dest: '.',
					rename: function(dst, src) {
						// To keep the source js files and make new files as `*.min.js`:
						//return dst + '/' + src.replace('.js', '.min.js');
						// Or to override to src:
						return src;
					}
				}]
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');


	grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);
};