'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _toutsuite = require('toutsuite');

var _toutsuite2 = _interopRequireDefault(_toutsuite);

var _detectiveSass = require('detective-sass');

var _detectiveSass2 = _interopRequireDefault(_detectiveSass);

var _detectiveScss = require('detective-scss');

var _detectiveScss2 = _interopRequireDefault(_detectiveScss);

var _sassLookup = require('sass-lookup');

var _sassLookup2 = _interopRequireDefault(_sassLookup);

var _compilerBase = require('../compiler-base');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const mimeTypes = ['text/sass', 'text/scss'];
let sass = null;

/**
 * @access private
 */
class SassCompiler extends _compilerBase.CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      comments: true,
      sourceMapEmbed: true,
      sourceMapContents: true
    };

    this.seenFilePaths = {};
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }

  shouldCompileFile(fileName, compilerContext) {
    return _asyncToGenerator(function* () {
      return true;
    })();
  }

  determineDependentFiles(sourceCode, filePath, compilerContext) {
    var _this = this;

    return _asyncToGenerator(function* () {
      return _this.determineDependentFilesSync(sourceCode, filePath, compilerContext);
    })();
  }

  compile(sourceCode, filePath, compilerContext) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      sass = sass || _this2.getSass();

      let thisPath = _path2.default.dirname(filePath);
      _this2.seenFilePaths[thisPath] = true;

      let paths = Object.keys(_this2.seenFilePaths);

      if (_this2.compilerOptions.paths) {
        paths.push(..._this2.compilerOptions.paths);
      }

      paths.unshift('.');

      sass.importer(_this2.buildImporterCallback(paths));

      let opts = Object.assign({}, _this2.compilerOptions, {
        indentedSyntax: filePath.match(/\.sass$/i),
        sourceMapRoot: filePath
      });

      delete opts.paths;

      let result = yield new Promise(function (res, rej) {
        sass.compile(sourceCode, opts, function (r) {
          if (r.status !== 0) {
            rej(new Error(r.formatted || r.message));
            return;
          }

          res(r);
          return;
        });
      });

      let source = result.text;

      // NB: If you compile a file that is solely imports, its
      // actual content is '' yet it is a valid file. '' is not
      // truthy, so we're going to replace it with a string that
      // is truthy.
      if (!source) {
        source = ' ';
      }

      return {
        code: source,
        mimeType: 'text/css'
      };
    })();
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    let dependencyFilenames = _path2.default.extname(filePath) === '.sass' ? (0, _detectiveSass2.default)(sourceCode) : (0, _detectiveScss2.default)(sourceCode);
    let dependencies = [];

    for (let dependencyName of dependencyFilenames) {
      dependencies.push((0, _sassLookup2.default)(dependencyName, _path2.default.basename(filePath), _path2.default.dirname(filePath)));
    }

    return dependencies;
  }

  compileSync(sourceCode, filePath, compilerContext) {
    sass = sass || this.getSass();

    let thisPath = _path2.default.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    paths.unshift('.');
    sass.importer(this.buildImporterCallback(paths));

    let opts = Object.assign({}, this.compilerOptions, {
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath
    });

    let result;
    (0, _toutsuite2.default)(() => {
      sass.compile(sourceCode, opts, r => {
        if (r.status !== 0) {
          throw new Error(r.formatted);
        }
        result = r;
      });
    });

    let source = result.text;

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source) {
      source = ' ';
    }

    return {
      code: source,
      mimeType: 'text/css'
    };
  }

  getSass() {
    let ret;
    (0, _toutsuite2.default)(() => ret = require('sass.js/dist/sass.node').Sass);
    return ret;
  }

  buildImporterCallback(includePaths) {
    const self = this;
    return function (request, done) {
      let file;
      if (request.file) {
        done();
        return;
      } else {
        // sass.js works in the '/sass/' directory
        const cleanedRequestPath = request.resolved.replace(/^\/sass\//, '');
        for (let includePath of includePaths) {
          const filePath = _path2.default.resolve(includePath, cleanedRequestPath);
          let variations = sass.getPathVariations(filePath);

          file = variations.map(self.fixWindowsPath.bind(self)).reduce(self.importedFileReducer.bind(self), null);

          if (file) {
            const content = _fs2.default.readFileSync(file, { encoding: 'utf8' });
            return sass.writeFile(file, content, () => {
              done({ path: file });
              return;
            });
          }
        }

        if (!file) {
          done();
          return;
        }
      }
    };
  }

  importedFileReducer(found, path) {
    // Find the first variation that actually exists
    if (found) return found;

    try {
      const stat = _fs2.default.statSync(path);
      if (!stat.isFile()) return null;
      return path;
    } catch (e) {
      return null;
    }
  }

  fixWindowsPath(file) {
    // Unfortunately, there's a bug in sass.js that seems to ignore the different
    // path separators across platforms

    // For some reason, some files have a leading slash that we need to get rid of
    if (process.platform === 'win32' && file[0] === '/') {
      file = file.slice(1);
    }

    // Sass.js generates paths such as `_C:\myPath\file.sass` instead of `C:\myPath\_file.sass`
    if (file[0] === '_') {
      const parts = file.slice(1).split(_path2.default.sep);
      const dir = parts.slice(0, -1).join(_path2.default.sep);
      const fileName = parts.reverse()[0];
      file = _path2.default.resolve(dir, '_' + fileName);
    }
    return file;
  }

  getCompilerVersion() {
    // NB: There is a bizarre bug in the node module system where this doesn't
    // work but only in saveConfiguration tests
    //return require('@paulcbetts/node-sass/package.json').version;
    return "4.1.1";
  }
}
exports.default = SassCompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jc3Mvc2Fzcy5qcyJdLCJuYW1lcyI6WyJtaW1lVHlwZXMiLCJzYXNzIiwiU2Fzc0NvbXBpbGVyIiwiY29uc3RydWN0b3IiLCJjb21waWxlck9wdGlvbnMiLCJjb21tZW50cyIsInNvdXJjZU1hcEVtYmVkIiwic291cmNlTWFwQ29udGVudHMiLCJzZWVuRmlsZVBhdGhzIiwiZ2V0SW5wdXRNaW1lVHlwZXMiLCJzaG91bGRDb21waWxlRmlsZSIsImZpbGVOYW1lIiwiY29tcGlsZXJDb250ZXh0IiwiZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXMiLCJzb3VyY2VDb2RlIiwiZmlsZVBhdGgiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlc1N5bmMiLCJjb21waWxlIiwiZ2V0U2FzcyIsInRoaXNQYXRoIiwiZGlybmFtZSIsInBhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInB1c2giLCJ1bnNoaWZ0IiwiaW1wb3J0ZXIiLCJidWlsZEltcG9ydGVyQ2FsbGJhY2siLCJvcHRzIiwiYXNzaWduIiwiaW5kZW50ZWRTeW50YXgiLCJtYXRjaCIsInNvdXJjZU1hcFJvb3QiLCJyZXN1bHQiLCJQcm9taXNlIiwicmVzIiwicmVqIiwiciIsInN0YXR1cyIsIkVycm9yIiwiZm9ybWF0dGVkIiwibWVzc2FnZSIsInNvdXJjZSIsInRleHQiLCJjb2RlIiwibWltZVR5cGUiLCJzaG91bGRDb21waWxlRmlsZVN5bmMiLCJkZXBlbmRlbmN5RmlsZW5hbWVzIiwiZXh0bmFtZSIsImRlcGVuZGVuY2llcyIsImRlcGVuZGVuY3lOYW1lIiwiYmFzZW5hbWUiLCJjb21waWxlU3luYyIsInJldCIsInJlcXVpcmUiLCJTYXNzIiwiaW5jbHVkZVBhdGhzIiwic2VsZiIsInJlcXVlc3QiLCJkb25lIiwiZmlsZSIsImNsZWFuZWRSZXF1ZXN0UGF0aCIsInJlc29sdmVkIiwicmVwbGFjZSIsImluY2x1ZGVQYXRoIiwicmVzb2x2ZSIsInZhcmlhdGlvbnMiLCJnZXRQYXRoVmFyaWF0aW9ucyIsIm1hcCIsImZpeFdpbmRvd3NQYXRoIiwiYmluZCIsInJlZHVjZSIsImltcG9ydGVkRmlsZVJlZHVjZXIiLCJjb250ZW50IiwicmVhZEZpbGVTeW5jIiwiZW5jb2RpbmciLCJ3cml0ZUZpbGUiLCJwYXRoIiwiZm91bmQiLCJzdGF0Iiwic3RhdFN5bmMiLCJpc0ZpbGUiLCJlIiwicHJvY2VzcyIsInBsYXRmb3JtIiwic2xpY2UiLCJwYXJ0cyIsInNwbGl0Iiwic2VwIiwiZGlyIiwiam9pbiIsInJldmVyc2UiLCJnZXRDb21waWxlclZlcnNpb24iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxNQUFNQSxZQUFZLENBQUMsV0FBRCxFQUFjLFdBQWQsQ0FBbEI7QUFDQSxJQUFJQyxPQUFPLElBQVg7O0FBRUE7OztBQUdlLE1BQU1DLFlBQU4sb0NBQXdDO0FBQ3JEQyxnQkFBYztBQUNaOztBQUVBLFNBQUtDLGVBQUwsR0FBdUI7QUFDckJDLGdCQUFVLElBRFc7QUFFckJDLHNCQUFnQixJQUZLO0FBR3JCQyx5QkFBbUI7QUFIRSxLQUF2Qjs7QUFNQSxTQUFLQyxhQUFMLEdBQXFCLEVBQXJCO0FBQ0Q7O0FBRUQsU0FBT0MsaUJBQVAsR0FBMkI7QUFDekIsV0FBT1QsU0FBUDtBQUNEOztBQUVLVSxtQkFBTixDQUF3QkMsUUFBeEIsRUFBa0NDLGVBQWxDLEVBQW1EO0FBQUE7QUFDakQsYUFBTyxJQUFQO0FBRGlEO0FBRWxEOztBQUVLQyx5QkFBTixDQUE4QkMsVUFBOUIsRUFBMENDLFFBQTFDLEVBQW9ESCxlQUFwRCxFQUFxRTtBQUFBOztBQUFBO0FBQ25FLGFBQU8sTUFBS0ksMkJBQUwsQ0FBaUNGLFVBQWpDLEVBQTZDQyxRQUE3QyxFQUF1REgsZUFBdkQsQ0FBUDtBQURtRTtBQUVwRTs7QUFFS0ssU0FBTixDQUFjSCxVQUFkLEVBQTBCQyxRQUExQixFQUFvQ0gsZUFBcEMsRUFBcUQ7QUFBQTs7QUFBQTtBQUNu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QVksR0FBaEQsRUFBcUQ7QUFDbkRBLGFBQU9BLEtBQUt5QixLQUFMLENBQVcsQ0FBWCxDQUFQO0FBQ0Q7O0FBRUQ7QUFDQSxRQUFJekIsS0FBSyxDQUFMLE1BQVksR0FBaEIsRUFBcUI7QUFDbkIsWUFBTTBCLFFBQVExQixLQUFLeUIsS0FBTCxDQUFXLENBQVgsRUFBY0UsS0FBZCxDQUFvQixlQUFLQyxHQUF6QixDQUFkO0FBQ0EsWUFBTUMsTUFBTUgsTUFBTUQsS0FBTixDQUFZLENBQVosRUFBZSxDQUFDLENBQWhCLEVBQW1CSyxJQUFuQixDQUF3QixlQUFLRixHQUE3QixDQUFaO0FBQ0EsWUFBTTdFLFdBQVcyRSxNQUFNSyxPQUFOLEdBQWdCLENBQWhCLENBQWpCO0FBQ0EvQixhQUFPLGVBQUtLLE9BQUwsQ0FBYXdCLEdBQWIsRUFBa0IsTUFBTTlFLFFBQXhCLENBQVA7QUFDRDtBQUNELFdBQU9pRCxJQUFQO0FBQ0Q7O0FBRURnQyx1QkFBcUI7QUFDbkI7QUFDQTtBQUNBO0FBQ0EsV0FBTyxPQUFQO0FBQ0Q7QUF2Tm9EO2tCQUFsQzFGLFkiLCJmaWxlIjoic2Fzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0b3V0U3VpdGUgZnJvbSAndG91dHN1aXRlJztcbmltcG9ydCBkZXRlY3RpdmVTQVNTIGZyb20gJ2RldGVjdGl2ZS1zYXNzJztcbmltcG9ydCBkZXRlY3RpdmVTQ1NTIGZyb20gJ2RldGVjdGl2ZS1zY3NzJztcbmltcG9ydCBzYXNzTG9va3VwIGZyb20gJ3Nhc3MtbG9va3VwJztcbmltcG9ydCB7Q29tcGlsZXJCYXNlfSBmcm9tICcuLi9jb21waWxlci1iYXNlJztcblxuY29uc3QgbWltZVR5cGVzID0gWyd0ZXh0L3Nhc3MnLCAndGV4dC9zY3NzJ107XG5sZXQgc2FzcyA9IG51bGw7XG5cbi8qKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNhc3NDb21waWxlciBleHRlbmRzIENvbXBpbGVyQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIGNvbW1lbnRzOiB0cnVlLFxuICAgICAgc291cmNlTWFwRW1iZWQ6IHRydWUsXG4gICAgICBzb3VyY2VNYXBDb250ZW50czogdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnNlZW5GaWxlUGF0aHMgPSB7fTtcbiAgfVxuXG4gIHN0YXRpYyBnZXRJbnB1dE1pbWVUeXBlcygpIHtcbiAgICByZXR1cm4gbWltZVR5cGVzO1xuICB9XG5cbiAgYXN5bmMgc2hvdWxkQ29tcGlsZUZpbGUoZmlsZU5hbWUsIGNvbXBpbGVyQ29udGV4dCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXMoc291cmNlQ29kZSwgZmlsZVBhdGgsIGNvbXBpbGVyQ29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLmRldGVybWluZURlcGVuZGVudEZpbGVzU3luYyhzb3VyY2VDb2RlLCBmaWxlUGF0aCwgY29tcGlsZXJDb250ZXh0KTtcbiAgfVxuXG4gIGFzeW5jIGNvbXBpbGUoc291cmNlQ29kZSwgZmlsZVBhdGgsIGNvbXBpbGVyQ29udGV4dCkge1xuICAgIHNhc3MgPSBzYXNzIHx8IHRoaXMuZ2V0U2FzcygpO1xuXG4gICAgbGV0IHRoaXNQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICB0aGlzLnNlZW5GaWxlUGF0aHNbdGhpc1BhdGhdID0gdHJ1ZTtcblxuICAgIGxldCBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuc2VlbkZpbGVQYXRocyk7XG5cbiAgICBpZiAodGhpcy5jb21waWxlck9wdGlvbnMucGF0aHMpIHtcbiAgICAgIHBhdGhzLnB1c2goLi4udGhpcy5jb21waWxlck9wdGlvbnMucGF0aHMpO1xuICAgIH1cblxuICAgIHBhdGhzLnVuc2hpZnQoJy4nKTtcblxuICAgIHNhc3MuaW1wb3J0ZXIodGhpcy5idWlsZEltcG9ydGVyQ2FsbGJhY2socGF0aHMpKTtcblxuICAgIGxldCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5jb21waWxlck9wdGlvbnMsIHtcbiAgICAgIGluZGVudGVkU3ludGF4OiBmaWxlUGF0aC5tYXRjaCgvXFwuc2FzcyQvaSksXG4gICAgICBzb3VyY2VNYXBSb290OiBmaWxlUGF0aCxcbiAgICB9KTtcblxuICAgIGRlbGV0ZSBvcHRzLnBhdGhzO1xuXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXMscmVqKSA9PiB7XG4gICAgICBzYXNzLmNvbXBpbGUoc291cmNlQ29kZSwgb3B0cywgKHIpID0+IHtcbiAgICAgICAgaWYgKHIuc3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgcmVqKG5ldyBFcnJvcihyLmZvcm1hdHRlZCB8fCByLm1lc3NhZ2UpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXMocik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbGV0IHNvdXJjZSA9IHJlc3VsdC50ZXh0O1xuXG4gICAgLy8gTkI6IElmIHlvdSBjb21waWxlIGEgZmlsZSB0aGF0IGlzIHNvbGVseSBpbXBvcnRzLCBpdHNcbiAgICAvLyBhY3R1YWwgY29udGVudCBpcyAnJyB5ZXQgaXQgaXMgYSB2YWxpZCBmaWxlLiAnJyBpcyBub3RcbiAgICAvLyB0cnV0aHksIHNvIHdlJ3JlIGdvaW5nIHRvIHJlcGxhY2UgaXQgd2l0aCBhIHN0cmluZyB0aGF0XG4gICAgLy8gaXMgdHJ1dGh5LlxuICAgIGlmICghc291cmNlKSB7XG4gICAgICBzb3VyY2UgPSAnICc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IHNvdXJjZSxcbiAgICAgIG1pbWVUeXBlOiAndGV4dC9jc3MnXG4gICAgfTtcbiAgfVxuXG4gIHNob3VsZENvbXBpbGVGaWxlU3luYyhmaWxlTmFtZSwgY29tcGlsZXJDb250ZXh0KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBkZXRlcm1pbmVEZXBlbmRlbnRGaWxlc1N5bmMoc291cmNlQ29kZSwgZmlsZVBhdGgsIGNvbXBpbGVyQ29udGV4dCkge1xuICAgIGxldCBkZXBlbmRlbmN5RmlsZW5hbWVzID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKSA9PT0gJy5zYXNzJyA/IGRldGVjdGl2ZVNBU1Moc291cmNlQ29kZSkgOiBkZXRlY3RpdmVTQ1NTKHNvdXJjZUNvZGUpO1xuICAgIGxldCBkZXBlbmRlbmNpZXMgPSBbXTtcblxuICAgIGZvciAobGV0IGRlcGVuZGVuY3lOYW1lIG9mIGRlcGVuZGVuY3lGaWxlbmFtZXMpIHtcbiAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHNhc3NMb29rdXAoZGVwZW5kZW5jeU5hbWUsIHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpLCBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcGVuZGVuY2llcztcbiAgfVxuXG4gIGNvbXBpbGVTeW5jKHNvdXJjZUNvZGUsIGZpbGVQYXRoLCBjb21waWxlckNvbnRleHQpIHtcbiAgICBzYXNzID0gc2FzcyB8fCB0aGlzLmdldFNhc3MoKTtcblxuICAgIGxldCB0aGlzUGF0aCA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XG4gICAgdGhpcy5zZWVuRmlsZVBhdGhzW3RoaXNQYXRoXSA9IHRydWU7XG5cbiAgICBsZXQgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnNlZW5GaWxlUGF0aHMpO1xuXG4gICAgaWYgKHRoaXMuY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgICBwYXRocy5wdXNoKC4uLnRoaXMuY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgICB9XG5cbiAgICBwYXRocy51bnNoaWZ0KCcuJyk7XG4gICAgc2Fzcy5pbXBvcnRlcih0aGlzLmJ1aWxkSW1wb3J0ZXJDYWxsYmFjayhwYXRocykpO1xuXG4gICAgbGV0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmNvbXBpbGVyT3B0aW9ucywge1xuICAgICAgaW5kZW50ZWRTeW50YXg6IGZpbGVQYXRoLm1hdGNoKC9cXC5zYXNzJC9pKSxcbiAgICAgIHNvdXJjZU1hcFJvb3Q6IGZpbGVQYXRoLFxuICAgIH0pO1xuXG4gICAgbGV0IHJlc3VsdDtcbiAgICB0b3V0U3VpdGUoKCkgPT4ge1xuICAgICAgc2Fzcy5jb21waWxlKHNvdXJjZUNvZGUsIG9wdHMsIChyKSA9PiB7XG4gICAgICAgIGlmIChyLnN0YXR1cyAhPT0gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyLmZvcm1hdHRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gcjtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbGV0IHNvdXJjZSA9IHJlc3VsdC50ZXh0O1xuXG4gICAgLy8gTkI6IElmIHlvdSBjb21waWxlIGEgZmlsZSB0aGF0IGlzIHNvbGVseSBpbXBvcnRzLCBpdHNcbiAgICAvLyBhY3R1YWwgY29udGVudCBpcyAnJyB5ZXQgaXQgaXMgYSB2YWxpZCBmaWxlLiAnJyBpcyBub3RcbiAgICAvLyB0cnV0aHksIHNvIHdlJ3JlIGdvaW5nIHRvIHJlcGxhY2UgaXQgd2l0aCBhIHN0cmluZyB0aGF0XG4gICAgLy8gaXMgdHJ1dGh5LlxuICAgIGlmICghc291cmNlKSB7XG4gICAgICBzb3VyY2UgPSAnICc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IHNvdXJjZSxcbiAgICAgIG1pbWVUeXBlOiAndGV4dC9jc3MnXG4gICAgfTtcbiAgfVxuXG4gIGdldFNhc3MoKSB7XG4gICAgbGV0IHJldDtcbiAgICB0b3V0U3VpdGUoKCkgPT4gcmV0ID0gcmVxdWlyZSgnc2Fzcy5qcy9kaXN0L3Nhc3Mubm9kZScpLlNhc3MpO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBidWlsZEltcG9ydGVyQ2FsbGJhY2sgKGluY2x1ZGVQYXRocykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiAoZnVuY3Rpb24gKHJlcXVlc3QsIGRvbmUpIHtcbiAgICAgIGxldCBmaWxlO1xuICAgICAgaWYgKHJlcXVlc3QuZmlsZSkge1xuICAgICAgICBkb25lKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNhc3MuanMgd29ya3MgaW4gdGhlICcvc2Fzcy8nIGRpcmVjdG9yeVxuICAgICAgICBjb25zdCBjbGVhbmVkUmVxdWVzdFBhdGggPSByZXF1ZXN0LnJlc29sdmVkLnJlcGxhY2UoL15cXC9zYXNzXFwvLywgJycpO1xuICAgICAgICBmb3IgKGxldCBpbmNsdWRlUGF0aCBvZiBpbmNsdWRlUGF0aHMpIHtcbiAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShpbmNsdWRlUGF0aCwgY2xlYW5lZFJlcXVlc3RQYXRoKTtcbiAgICAgICAgICBsZXQgdmFyaWF0aW9ucyA9IHNhc3MuZ2V0UGF0aFZhcmlhdGlvbnMoZmlsZVBhdGgpO1xuXG4gICAgICAgICAgZmlsZSA9IHZhcmlhdGlvbnNcbiAgICAgICAgICAgIC5tYXAoc2VsZi5maXhXaW5kb3dzUGF0aC5iaW5kKHNlbGYpKVxuICAgICAgICAgICAgLnJlZHVjZShzZWxmLmltcG9ydGVkRmlsZVJlZHVjZXIuYmluZChzZWxmKSwgbnVsbCk7XG5cbiAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlLCB7IGVuY29kaW5nOiAndXRmOCcgfSk7XG4gICAgICAgICAgICByZXR1cm4gc2Fzcy53cml0ZUZpbGUoZmlsZSwgY29udGVudCwgKCkgPT4ge1xuICAgICAgICAgICAgICBkb25lKHsgcGF0aDogZmlsZSB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFmaWxlKSB7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaW1wb3J0ZWRGaWxlUmVkdWNlcihmb3VuZCwgcGF0aCkge1xuICAgIC8vIEZpbmQgdGhlIGZpcnN0IHZhcmlhdGlvbiB0aGF0IGFjdHVhbGx5IGV4aXN0c1xuICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhwYXRoKTtcbiAgICAgIGlmICghc3RhdC5pc0ZpbGUoKSkgcmV0dXJuIG51bGw7XG4gICAgICByZXR1cm4gcGF0aDtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZpeFdpbmRvd3NQYXRoKGZpbGUpIHtcbiAgICAvLyBVbmZvcnR1bmF0ZWx5LCB0aGVyZSdzIGEgYnVnIGluIHNhc3MuanMgdGhhdCBzZWVtcyB0byBpZ25vcmUgdGhlIGRpZmZlcmVudFxuICAgIC8vIHBhdGggc2VwYXJhdG9ycyBhY3Jvc3MgcGxhdGZvcm1zXG5cbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHNvbWUgZmlsZXMgaGF2ZSBhIGxlYWRpbmcgc2xhc2ggdGhhdCB3ZSBuZWVkIHRvIGdldCByaWQgb2ZcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyAmJiBmaWxlWzBdID09PSAnLycpIHtcbiAgICAgIGZpbGUgPSBmaWxlLnNsaWNlKDEpO1xuICAgIH1cblxuICAgIC8vIFNhc3MuanMgZ2VuZXJhdGVzIHBhdGhzIHN1Y2ggYXMgYF9DOlxcbXlQYXRoXFxmaWxlLnNhc3NgIGluc3RlYWQgb2YgYEM6XFxteVBhdGhcXF9maWxlLnNhc3NgXG4gICAgaWYgKGZpbGVbMF0gPT09ICdfJykge1xuICAgICAgY29uc3QgcGFydHMgPSBmaWxlLnNsaWNlKDEpLnNwbGl0KHBhdGguc2VwKTtcbiAgICAgIGNvbnN0IGRpciA9IHBhcnRzLnNsaWNlKDAsIC0xKS5qb2luKHBhdGguc2VwKTtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFydHMucmV2ZXJzZSgpWzBdO1xuICAgICAgZmlsZSA9IHBhdGgucmVzb2x2ZShkaXIsICdfJyArIGZpbGVOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBnZXRDb21waWxlclZlcnNpb24oKSB7XG4gICAgLy8gTkI6IFRoZXJlIGlzIGEgYml6YXJyZSBidWcgaW4gdGhlIG5vZGUgbW9kdWxlIHN5c3RlbSB3aGVyZSB0aGlzIGRvZXNuJ3RcbiAgICAvLyB3b3JrIGJ1dCBvbmx5IGluIHNhdmVDb25maWd1cmF0aW9uIHRlc3RzXG4gICAgLy9yZXR1cm4gcmVxdWlyZSgnQHBhdWxjYmV0dHMvbm9kZS1zYXNzL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG4gICAgcmV0dXJuIFwiNC4xLjFcIjtcbiAgfVxufVxuIl19