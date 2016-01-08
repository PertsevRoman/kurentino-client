var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var angularFilesort = require('gulp-angular-filesort');
var csslint = require('gulp-csslint');
var minifyCss = require('gulp-minify-css');
var templateCache = require('gulp-angular-templatecache');
var sass = require('gulp-ruby-sass');

/**
* Список JS-файлов
*/
gulp.task('jslint', function () {
    return gulp
        .src(['./modules/**/*.js', './js/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

/**
* Склейка и минификация JS
*/
gulp.task('jsminify', function () {
    return gulp
        .src(['./modules/**/*.js', './js/*.js'])
        .pipe(angularFilesort())
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(rename('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

/**
* Список SASS-файлов
*/
gulp.task('csslint', function () {
    return gulp
        .src(['./modules/**/*.scss', './css/*.scss'])
        .pipe(csslint())
        .pipe(csslint.reporter());
});

/**
* Склейка и минификация SASS
*/
gulp.task('cssminify', function () {
    return sass(['./modules/**/*.scss', './css/*.scss'])
        .pipe(concat('app.css'))
        .pipe(gulp.dest('./dist'))
        .pipe(rename('app.min.css'))
        .pipe(minifyCss())
        .pipe(gulp.dest('./dist'));
});

/**
* Кэширование шаблонов
*/
gulp.task('templates', function () {
    return gulp.src('./modules/**/*.html')
        .pipe(templateCache({module:'templatescache', standalone:true, root: './dist'}))
        .pipe(gulp.dest('./dist'));
});

/**
* Запуск основных задач
*/
gulp.task('default', function () {
    gulp.run('templates', 'jslint', 'jsminify', 'csslint', 'cssminify');
    gulp.watch(['./modules/**/*.js', './js/*.js', './modules/**/*.scss', './css/*.scss', './modules/**/*.html'], function(event) {
        gulp.run('templates', 'jslint', 'jsminify', 'csslint', 'cssminify');
    });
});