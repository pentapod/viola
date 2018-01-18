import React, { Component } from 'react';
import classnames from 'classnames';
import Project from './../../misc/project';
import { ViolaLogo } from './../../ui/Logo';
import { StatusIndicator } from './../../ui/StatusIndicator';
import { ProgressBar } from './../../ui/ProgressBar';
import SideNav from './../SideNav';
import ToolBar from './../ToolBar';
import './App.css';

const {
  REACT_APP_BRAMBLE_HOST_URL,
  REACT_APP_VERSION,
  REACT_APP_VIOLA_HOMEPAGE,
} = process.env;

// eslint-disable-next-line
const Bramble = window.Bramble;

let projectRoot = '/viola';
// Use beta subdirectory
if (REACT_APP_VERSION.split('.')[0] === '0') {
  projectRoot += '/beta';
}

// Constants for displaying loading progress
const PROGRESS_RATE_FOR_LOADING_VIOLA = 0.2;
const PROGRESS_RATE_FOR_LOADING_BRAMBLE = 0.5;
const PROGRESS_RATE_FOR_LOADING_PROJECT = 0.3;

class App extends Component {

  state = {
    bramble: null,
    modalOpen: false,
    hideSpinner: false,
    fontLoaded: false,
    spinnerDisplayMode: 'flex',
    fullscreenEnabled: false,
    sidebarHidden: false,
    loadingViolaProgress: 0,
    loadingBrambleProgress: 0,
  };

  downloadProject = async () => {
    const fs = Bramble.getFileSystem();
    const sh = new fs.Shell();
    const path = Bramble.Filer.Path;
    const FilerBuffer = Bramble.Filer.Buffer;
    const { projectMeta } = this.props.data;
    const project = new Project({ path, fs, sh, FilerBuffer, projectMeta, projectRoot });

    await project.initialize();
  };

  initBramble = (bramble) => {
    bramble.showSidebar();
    bramble.useDarkTheme();   // if not set, sometimes use light theme
    bramble.on('dialogOpened', () => {
      this.setState(Object.assign({}, this.state, {
        modalOpen: true,
      }));
    });
    bramble.on('dialogClosed', () => {
      this.setState(Object.assign({}, this.state, {
        modalOpen: false,
      }));
    });

    this.setState(Object.assign({}, this.state, {
      bramble: bramble,
    }));
  };

  onFullscreenStatusChanged = (fullscreenEnabled) => {
    this.setState({ fullscreenEnabled });
  };

  onSidebarVisibilityChanged = (sidebarHidden) => {
    this.setState({ sidebarHidden });
  }

  componentDidMount() {
    if (window.document.fonts) {
      window.document.fonts.ready.then(fontFaceSet => {
        this.setState({
          fontLoaded: true,
        });
      });
    }
    else {
      this.setState({
        fontLoaded: true,
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.progress) {
          console.log("message from SW : ", event.data.progress);
          this.setState({
            loadingViolaProgress: event.data.progress,
          });
        }
      });
    }

    Bramble.load('#bramble-root', {
      url: REACT_APP_BRAMBLE_HOST_URL,
      // debug: false,
      // useLocationSearch: true,
      hideUntilReady: true,
      zipFilenamePrefix: 'viola-project',
      capacity: 50 * 1000 * 1000,
    });

    Bramble.once('error', (error) => {
      console.error('Bramble error', error);
    });

    Bramble.on('ready', (bramble) => {
      this.initBramble(bramble);

      this.setState(Object.assign({}, this.state, {
        hideSpinner: true,
      }));
      setTimeout(() => {
        this.setState(Object.assign({}, this.state, {
          spinnerDisplayMode: 'none',
        }));
      }, 1000);
    });

    Bramble.on('readyStateChange', (previous, current) => {
      if (current === Bramble.MOUNTABLE) {
        this.downloadProject().then(() => {
          Bramble.mount(projectRoot);
        });
      }
    });
  }

  render() {
    const {
      bramble,
      modalOpen,
      hideSpinner,
      fontLoaded,
      spinnerDisplayMode,
      fullscreenEnabled,
      sidebarHidden,
      loadingViolaProgress,
      loadingBrambleProgress,
    } = this.state;
    const appClasses = classnames('App', {
      'modal-open': modalOpen,
      'fullscreen': fullscreenEnabled,
      'sidebar-hidden': sidebarHidden,
    });

    const progressValue = loadingViolaProgress * PROGRESS_RATE_FOR_LOADING_VIOLA
                        + loadingBrambleProgress * PROGRESS_RATE_FOR_LOADING_BRAMBLE;

    return (
      <div className={appClasses}>
        <nav className="App-header">
          <div className="App-header-title">
            <a href={REACT_APP_VIOLA_HOMEPAGE}>
              <ViolaLogo white className="App-header-title-logo" />
            </a>
          </div>
          <div className="App-header-lr">
            <div className="App-header-left">
            </div>
            <div className="App-header-right">
              <StatusIndicator />
            </div>
          </div>
        </nav>
        {bramble &&
          <ToolBar bramble={bramble}
            fullscreenEnabled={fullscreenEnabled}
            sidebarHidden={sidebarHidden}
            onFullscreenStatusChanged={this.onFullscreenStatusChanged}
            onSidebarVisibilityChanged={this.onSidebarVisibilityChanged}
          />
        }
        <div id="bramble-root" className="App-brambleroot"></div>
        {bramble &&
          <SideNav bramble={bramble} />
        }
        <div className={`App-loading_container ${hideSpinner? 'hidden' : ''}`}
          style={{ display: spinnerDisplayMode }}
        >
          {fontLoaded &&
            <ViolaLogo black className="App-loading_logo" />
          }
          <div className="App-loading_message">Starting<br/>Viola</div>
          <ProgressBar value={progressValue} max={1} />
        </div>
      </div>
    );
  }
}

export default App;
