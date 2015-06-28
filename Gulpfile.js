'use strict';
var gulp = require('gulp'),
    watch = require('gulp-watch'),
    babel = require('gulp-babel');

var babel_opt = {
  stage: 0
};

gulp.task('default', function () {
  return gulp.src('src/*.js')
    .pipe(babel(babel_opt))
    .pipe(gulp.dest('lib'));
});

gulp.task('watch', function () {
  return gulp.src('src/*.js')
    .pipe(watch('src/*.js'))
    .pipe(babel(babel_opt))
    .pipe(gulp.dest('lib'));
});
