import React from 'react';
import createComponent, { Component, sstyled, Root } from '@semcore/core';
import { FadeInOut } from '@semcore/animation';
import Spin from '@semcore/spin';
import { Box } from '@semcore/flex-box';
import resolveColorEnhance from '@semcore/utils/lib/enhances/resolveColorEnhance';
import { isAdvanceMode } from '@semcore/utils/lib/findComponent';

import style from './style/spin-container.shadow.css';

class SpinContainerRoot extends Component {
  static displayName = 'SpinContainer';
  static style = style;
  static defaultProps = {
    size: 'xxl',
    theme: 'dark',
    duration: 200,
  };
  static enhance = [resolveColorEnhance()];

  getOverlayProps() {
    const { loading, background, duration, size, theme, resolveColor } = this.asProps;
    return {
      background,
      // for Animated
      loading,
      duration,
      // for Spin
      size,
      theme,
      resolveColor,
    };
  }

  render() {
    const SSpinContainer = Root;
    const { styles, Children, loading, forcedAdvancedMode } = this.asProps;

    const advancedMode =
      forcedAdvancedMode || isAdvanceMode(Children, [SpinContainer.Overlay.displayName]);

    return sstyled(styles)(
      <SSpinContainer render={Box} aria-busy={loading}>
        {advancedMode ? (
          <Children />
        ) : (
          <>
            <SpinContainer.Content>
              <Children />
            </SpinContainer.Content>
            <SpinContainer.Overlay />
          </>
        )}
      </SSpinContainer>,
    );
  }
}

class Overlay extends Component {
  static defaultProps = ({ size, theme }) => ({
    children: <Spin size={size} theme={theme} />,
  });

  render() {
    const SOverlay = Root;
    const { styles, theme, background, loading, duration, resolveColor } = this.asProps;
    const useTheme = background ? 'custom' : theme;

    return sstyled(styles)(
      <FadeInOut visible={loading} duration={duration}>
        <SOverlay render={Box} use:theme={useTheme} use:background={resolveColor(background)} />
      </FadeInOut>,
    );
  }
}

function Content(props) {
  const SContent = Root;
  const { styles } = props;
  return sstyled(styles)(<SContent render={Box} />);
}

const SpinContainer = createComponent(SpinContainerRoot, {
  Overlay,
  Content,
});

export default SpinContainer;
