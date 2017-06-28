'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _compilerBase = require('../compiler-base');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const mimeTypes = ['text/jsx', 'application/javascript'];
let babel = null;
let istanbul = null;

class BabelCompiler extends _compilerBase.SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }

  // NB: This method exists to stop Babel from trying to load plugins from the
  // app's node_modules directory, which in a production app doesn't have Babel
  // installed in it. Instead, we try to load from our entry point's node_modules
  // directory (i.e. Grunt perhaps), and if it doesn't work, just keep going.
  attemptToPreload(names, prefix) {
    const fixupModule = exp => {
      // NB: Some plugins like transform-decorators-legacy, use import/export
      // semantics, and others don't
      if ('default' in exp) return exp['default'];
      return exp;
    };

    const preloadStrategies = [() => names.map(x => fixupModule(require.main.require(`babel-${prefix}-${x}`))), () => {
      let nodeModulesAboveUs = _path2.default.resolve(__dirname, '..', '..', '..');
      return names.map(x => fixupModule(require(_path2.default.join(nodeModulesAboveUs, `babel-${prefix}-${x}`))));
    }, () => names.map(x => fixupModule(require(`babel-${prefix}-${x}`)))];

    for (let strategy of preloadStrategies) {
      try {
        return strategy();
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  compileSync(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = Object.assign({}, this.compilerOptions, {
      filename: filePath,
      ast: false,
      babelrc: false
    });

    let useCoverage = false;
    if ('coverage' in opts) {
      useCoverage = !!opts.coverage;
      delete opts.coverage;
    }

    if ('plugins' in opts) {
      let plugins = this.attemptToPreload(opts.plugins, 'plugin');
      if (plugins && plugins.length === opts.plugins.length) opts.plugins = plugins;
    }

    if ('presets' in opts) {
      let presets = this.attemptToPreload(opts.presets, 'preset');
      if (presets && presets.length === opts.presets.length) opts.presets = presets;
    }

    const output = babel.transform(sourceCode, opts);
    let sourceMaps = output.map ? JSON.stringify(output.map) : null;

    let code = output.code;
    if (useCoverage) {
      istanbul = istanbul || require('istanbul');

      sourceMaps = null;
      code = new istanbul.Instrumenter().instrumentSync(output.code, filePath);
    }

    return { code, sourceMaps, mimeType: 'application/javascript' };
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
exports.default = BabelCompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9iYWJlbC5qcyJdLCJuYW1lcyI6WyJtaW1lVHlwZXMiLCJiYWJlbCIsImlzdGFuYnVsIiwiQmFiZWxDb21waWxlciIsImNvbnN0cnVjdG9yIiwiZ2V0SW5wdXRNaW1lVHlwZXMiLCJhdHRlbXB0VG9QcmVsb2FkIiwibmFtZXMiLCJwcmVmaXgiLCJmaXh1cE1vZHVsZSIsImV4cCIsInByZWxvYWRTdHJhdGVnaWVzIiwibWFwIiwieCIsInJlcXVpcmUiLCJtYWluIiwibm9kZU1vZHVsZXNBYm92ZVVzIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsImpvaW4iLCJzdHJhdGVneSIsImUiLCJjb21waWxlU3luYyIsInNvdXJjZUNvZGUiLCJmaWxlUGF0aCIsImNvbXBpbGVyQ29udGV4dCIsIm9wdHMiLCJPYmplY3QiLCJhc3NpZ24iLCJjb21waWxlck9wdGlvbnMiLCJmaWxlbmFtZSIsImFzdCIsImJhYmVscmMiLCJ1c2VDb3ZlcmFnZSIsImNvdmVyYWdlIiwicGx1Z2lucyIsImxlbmd0aCIsInByZXNldHMiLCJvdXRwdXQiLCJ0cmFuc2Zvcm0iLCJzb3VyY2VNYXBzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvZGUiLCJJbnN0cnVtZW50ZXIiLCJpbnN0cnVtZW50U3luYyIsIm1pbWVUeXBlIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIiwidmVyc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUVBLE1BQU1BLFlBQVksQ0FBQyxVQUFELEVBQWEsd0JBQWIsQ0FBbEI7QUFDQSxJQUFJQyxRQUFRLElBQVo7QUFDQSxJQUFJQyxXQUFXLElBQWY7O0FBRWUsTUFBTUMsYUFBTiwwQ0FBK0M7QUFDNURDLGdCQUFjO0FBQ1o7QUFDRDs7QUFFRCxTQUFPQyxpQkFBUCxHQUEyQjtBQUN6QixXQUFPTCxTQUFQO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQU0sbUJBQWlCQyxLQUFqQixFQUF3QkMsTUFBeEIsRUFBZ0M7QUFDOUIs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QUFSLEVBQW9CTSxVQUFVLHdCQUE5QixFQUFQO0FBQ0Q7O0FBRURDLHVCQUFxQjtBQUNuQixXQUFPakMsUUFBUSx5QkFBUixFQUFtQ2tDLE9BQTFDO0FBQ0Q7QUFsRjJEO2tCQUF6QzdDLGEiLCJmaWxlIjoiYmFiZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7U2ltcGxlQ29tcGlsZXJCYXNlfSBmcm9tICcuLi9jb21waWxlci1iYXNlJztcblxuY29uc3QgbWltZVR5cGVzID0gWyd0ZXh0L2pzeCcsICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0J107XG5sZXQgYmFiZWwgPSBudWxsO1xubGV0IGlzdGFuYnVsID0gbnVsbDtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFiZWxDb21waWxlciBleHRlbmRzIFNpbXBsZUNvbXBpbGVyQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0SW5wdXRNaW1lVHlwZXMoKSB7XG4gICAgcmV0dXJuIG1pbWVUeXBlcztcbiAgfVxuXG4gIC8vIE5COiBUaGlzIG1ldGhvZCBleGlzdHMgdG8gc3RvcCBCYWJlbCBmcm9tIHRyeWluZyB0byBsb2FkIHBsdWdpbnMgZnJvbSB0aGVcbiAgLy8gYXBwJ3Mgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSwgd2hpY2ggaW4gYSBwcm9kdWN0aW9uIGFwcCBkb2Vzbid0IGhhdmUgQmFiZWxcbiAgLy8gaW5zdGFsbGVkIGluIGl0LiBJbnN0ZWFkLCB3ZSB0cnkgdG8gbG9hZCBmcm9tIG91ciBlbnRyeSBwb2ludCdzIG5vZGVfbW9kdWxlc1xuICAvLyBkaXJlY3RvcnkgKGkuZS4gR3J1bnQgcGVyaGFwcyksIGFuZCBpZiBpdCBkb2Vzbid0IHdvcmssIGp1c3Qga2VlcCBnb2luZy5cbiAgYXR0ZW1wdFRvUHJlbG9hZChuYW1lcywgcHJlZml4KSB7XG4gICAgY29uc3QgZml4dXBNb2R1bGUgPSAoZXhwKSA9PiB7XG4gICAgICAvLyBOQjogU29tZSBwbHVnaW5zIGxpa2UgdHJhbnNmb3JtLWRlY29yYXRvcnMtbGVnYWN5LCB1c2UgaW1wb3J0L2V4cG9ydFxuICAgICAgLy8gc2VtYW50aWNzLCBhbmQgb3RoZXJzIGRvbid0XG4gICAgICBpZiAoJ2RlZmF1bHQnIGluIGV4cCkgcmV0dXJuIGV4cFsnZGVmYXVsdCddO1xuICAgICAgcmV0dXJuIGV4cDtcbiAgICB9O1xuXG4gICAgY29uc3QgcHJlbG9hZFN0cmF0ZWdpZXMgPSBbXG4gICAgICAoKSA9PiBuYW1lcy5tYXAoKHgpID0+IGZpeHVwTW9kdWxlKHJlcXVpcmUubWFpbi5yZXF1aXJlKGBiYWJlbC0ke3ByZWZpeH0tJHt4fWApKSksXG4gICAgICAoKSA9PiB7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0Fib3ZlVXMgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnLi4nKTtcbiAgICAgICAgcmV0dXJuIG5hbWVzLm1hcCgoeCkgPT4gZml4dXBNb2R1bGUocmVxdWlyZShwYXRoLmpvaW4obm9kZU1vZHVsZXNBYm92ZVVzLCBgYmFiZWwtJHtwcmVmaXh9LSR7eH1gKSkpKTtcbiAgICAgIH0sXG4gICAgICAoKSA9PiBuYW1lcy5tYXAoKHgpID0+IGZpeHVwTW9kdWxlKHJlcXVpcmUoYGJhYmVsLSR7cHJlZml4fS0ke3h9YCkpKVxuICAgIF07XG5cbiAgICBmb3IgKGxldCBzdHJhdGVneSBvZiBwcmVsb2FkU3RyYXRlZ2llcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHN0cmF0ZWd5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29tcGlsZVN5bmMoc291cmNlQ29kZSwgZmlsZVBhdGgsIGNvbXBpbGVyQ29udGV4dCkge1xuICAgIGJhYmVsID0gYmFiZWwgfHwgcmVxdWlyZSgnYmFiZWwtY29yZScpO1xuXG4gICAgbGV0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmNvbXBpbGVyT3B0aW9ucywge1xuICAgICAgZmlsZW5hbWU6IGZpbGVQYXRoLFxuICAgICAgYXN0OiBmYWxzZSxcbiAgICAgIGJhYmVscmM6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBsZXQgdXNlQ292ZXJhZ2UgPSBmYWxzZTtcbiAgICBpZiAoJ2NvdmVyYWdlJyBpbiBvcHRzKSB7XG4gICAgICB1c2VDb3ZlcmFnZSA9ICEhb3B0cy5jb3ZlcmFnZTtcbiAgICAgIGRlbGV0ZSBvcHRzLmNvdmVyYWdlO1xuICAgIH1cblxuICAgIGlmICgncGx1Z2lucycgaW4gb3B0cykge1xuICAgICAgbGV0IHBsdWdpbnMgPSB0aGlzLmF0dGVtcHRUb1ByZWxvYWQob3B0cy5wbHVnaW5zLCAncGx1Z2luJyk7XG4gICAgICBpZiAocGx1Z2lucyAmJiBwbHVnaW5zLmxlbmd0aCA9PT0gb3B0cy5wbHVnaW5zLmxlbmd0aCkgb3B0cy5wbHVnaW5zID0gcGx1Z2lucztcbiAgICB9XG5cbiAgICBpZiAoJ3ByZXNldHMnIGluIG9wdHMpIHtcbiAgICAgIGxldCBwcmVzZXRzID0gdGhpcy5hdHRlbXB0VG9QcmVsb2FkKG9wdHMucHJlc2V0cywgJ3ByZXNldCcpO1xuICAgICAgaWYgKHByZXNldHMgJiYgcHJlc2V0cy5sZW5ndGggPT09IG9wdHMucHJlc2V0cy5sZW5ndGgpIG9wdHMucHJlc2V0cyA9IHByZXNldHM7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0ID0gYmFiZWwudHJhbnNmb3JtKHNvdXJjZUNvZGUsIG9wdHMpO1xuICAgIGxldCBzb3VyY2VNYXBzID0gb3V0cHV0Lm1hcCA/IEpTT04uc3RyaW5naWZ5KG91dHB1dC5tYXApIDogbnVsbDtcblxuICAgIGxldCBjb2RlID0gb3V0cHV0LmNvZGU7XG4gICAgaWYgKHVzZUNvdmVyYWdlKSB7XG4gICAgICBpc3RhbmJ1bCA9IGlzdGFuYnVsIHx8IHJlcXVpcmUoJ2lzdGFuYnVsJyk7XG5cbiAgICAgIHNvdXJjZU1hcHMgPSBudWxsO1xuICAgICAgY29kZSA9IChuZXcgaXN0YW5idWwuSW5zdHJ1bWVudGVyKCkpLmluc3RydW1lbnRTeW5jKG91dHB1dC5jb2RlLCBmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgY29kZSwgc291cmNlTWFwcywgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JywgfTtcbiAgfVxuXG4gIGdldENvbXBpbGVyVmVyc2lvbigpIHtcbiAgICByZXR1cm4gcmVxdWlyZSgnYmFiZWwtY29yZS9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuICB9XG59XG4iXX0=