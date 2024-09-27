import React from 'react';
import createComponent, { Component, sstyled, Root } from '@semcore/core';
import { Flex } from '@semcore/flex-box';
import Input from '@semcore/input';
import { Text } from '@semcore/typography';
import Button, { ButtonLink } from '@semcore/button';
import { Hint } from '@semcore/tooltip';
import ChevronDoubleLeft from '@semcore/icon/ChevronDoubleLeft/m/index';
import uniqueIDEnhancement from '@semcore/utils/lib/uniqueID';
import i18nEnhance from '@semcore/utils/lib/enhances/i18nEnhance';
import { localizedMessages } from './translations/__intergalactic-dynamic-locales';

import style from './style/pagination.shadow.css';
import { ScreenReaderOnly } from '@semcore/utils/lib/ScreenReaderOnly';

function formatThousands(value) {
  const main = String(value);
  const length = main.length;
  let output = '';
  let i = length - 1;

  while (i >= 0) {
    output = main.charAt(i) + output;
    if ((length - i) % 3 === 0 && i > 0) {
      output = `,${output}`;
    }
    i -= 1;
  }

  return output;
}

class PaginationRoot extends Component {
  static displayName = 'Pagination';

  static defaultProps = (props) => {
    const totalPages = props.totalPages || props.defaultTotalPages || 1;
    return {
      defaultCurrentPage: 1,
      defaultTotalPages: 1,
      i18n: localizedMessages,
      locale: 'en',
      children: (
        <>
          {totalPages === 1 ? null : (
            <>
              <Pagination.FirstPage />
              <Pagination.PrevPage />
              <Pagination.NextPage />
            </>
          )}
          <Pagination.PageInput />
          <Pagination.TotalPages />
        </>
      ),
    };
  };
  static style = style;
  static enhance = [i18nEnhance(localizedMessages)];

  nextPageButtonRef = React.createRef();
  prevPageButtonRef = React.createRef();

  state = {
    // Crutch, so as not to take out `dirtyCurrentPage` in props
    dirtyCurrentPage: undefined,
  };

  pageInputAddonRef = React.createRef();

  uncontrolledProps() {
    return {
      totalPages: null,
      currentPage: null,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentPage !== undefined && prevProps.currentPage !== this.asProps.currentPage) {
      this.setState({ dirtyCurrentPage: undefined });
    }
  }

  returnLostFocus = () => {
    setTimeout(() => {
      if (document.activeElement !== document.body) return;

      const prevPageButton = this.prevPageButtonRef.current;
      const nextPageButton = this.nextPageButtonRef.current;

      if (prevPageButton && !prevPageButton.disabled) {
        prevPageButton.focus();
      } else if (nextPageButton && !nextPageButton.disabled) {
        nextPageButton.focus();
      }
    }, 0);
  };

  handlePageChange = (currentPage) => {
    currentPage = Number(currentPage);
    if (Number.isNaN(currentPage)) {
      return;
    }
    this.handlers.currentPage(currentPage);
    this.setState({ dirtyCurrentPage: undefined });
    this.returnLostFocus();
  };

  handlePageValueChange = (value) => {
    const { dirtyCurrentPage } = this.state;
    if (Number.isNaN(Number(value))) {
      value = dirtyCurrentPage;
    }
    this.setState({ dirtyCurrentPage: value });
  };

  handlePageValueBlur = () => {
    setTimeout(() => {
      if (this.pageInputAddonRef.current !== document.activeElement) {
        const { currentPage } = this.asProps;
        this.setState({ dirtyCurrentPage: currentPage });
      }
    }, 0);
  };

  getDirtyCurrentPage = () => {
    const { dirtyCurrentPage } = this.state;
    const { totalPages } = this.asProps;
    const finalValue = dirtyCurrentPage > totalPages ? totalPages : dirtyCurrentPage;
    return finalValue <= 0 ? 1 : finalValue;
  };

  /** @deprecated */
  handlePageInputIconClick = () => {
    const dirtyCurrentPage = this.getDirtyCurrentPage();
    this.handlePageChange(dirtyCurrentPage);
  };

  handlePageInputKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    const dirtyCurrentPage = this.getDirtyCurrentPage();
    this.handlePageChange(dirtyCurrentPage);
  };

  getFirstPageProps = () => {
    const { currentPage, getI18nText } = this.asProps;
    const disabled = currentPage <= 1;
    return {
      disabled,
      onClick: () => this.handlePageChange(1),
      getI18nText,
    };
  };

  getPrevPageProps = () => {
    const { currentPage, getI18nText } = this.asProps;
    const disabled = currentPage <= 1;
    return {
      currentPage,
      disabled,
      onClick: () => this.handlePageChange(currentPage - 1),
      getI18nText,
      ref: this.nextPageButtonRef,
    };
  };

  getNextPageProps = () => {
    const { currentPage, totalPages, getI18nText } = this.asProps;
    const disabled = !(currentPage < totalPages);
    return {
      currentPage,
      disabled,
      onClick: () => this.handlePageChange(currentPage + 1),
      getI18nText,
      ref: this.prevPageButtonRef,
    };
  };

  getPageInputProps = () => {
    const { getI18nText } = this.asProps;
    return {
      getI18nText,
    };
  };

  /** @deprecated */
  getPageInputAddonProps = () => {
    return {
      onClick: this.handlePageInputIconClick,
      ref: this.pageInputAddonRef,
      onBlur: this.handlePageValueBlur,
    };
  };

  getPageInputValueProps = () => {
    const { dirtyCurrentPage } = this.state;
    const { currentPage, totalPages, getI18nText } = this.asProps;
    return {
      min: 1,
      max: totalPages,
      value: dirtyCurrentPage === undefined ? currentPage : dirtyCurrentPage,
      onBlur: this.handlePageValueBlur,
      onChange: this.handlePageValueChange,
      onKeyDown: this.handlePageInputKeyDown,
      getI18nText,
    };
  };

  getTotalPagesProps = () => {
    const { currentPage, totalPages, getI18nText } = this.asProps;
    return {
      totalPages,
      children: formatThousands(totalPages),
      isLastOrSingle: currentPage === totalPages,
      onClick: () => this.handlePageChange(totalPages),
      getI18nText,
    };
  };

  render() {
    const SPagination = Root;
    const { Children, getI18nText, currentPage } = this.asProps;
    return sstyled(this.asProps.styles)(
      <SPagination render={Flex} tag='nav' aria-label={getI18nText('pagination')}>
        <Children />
        <ScreenReaderOnly aria-live={'polite'} role={'status'}>
          {getI18nText('pageInputLabel')} {currentPage}
        </ScreenReaderOnly>
      </SPagination>,
    );
  }
}

class FirstPage extends Component {
  static defaultProps = (props) => {
    const hintContent = props.getI18nText('firstPage');

    return {
      children: (
        <Button.Addon
          tag={Hint}
          title={hintContent}
          timeout={[250, 50]}
          __excludeProps={['aria-label']}
        >
          <ChevronDoubleLeft />
        </Button.Addon>
      ),
    };
  };

  render() {
    const { getI18nText } = this.asProps;

    return <Root render={Button} aria-label={getI18nText('firstPage')} />;
  }
}

class PrevPage extends Component {
  static defaultProps = (props) => ({
    children: props.getI18nText('prevPageLabel'),
  });

  render() {
    const SPrevPage = Root;
    return sstyled(this.asProps.styles)(<SPrevPage render={Button} />);
  }
}
class NextPage extends Component {
  static defaultProps = (props) => ({
    children: props.getI18nText('nextPageLabel'),
  });

  render() {
    const SNextPage = Root;
    return sstyled(this.asProps.styles)(<SNextPage render={Button} use='primary' theme='info' />);
  }
}

class TotalPages extends Component {
  render() {
    const STotalPages = Root;
    const STotalPagesLabel = Text;
    const STotalLastPages = Text;
    const { styles, getI18nText, totalPages, isLastOrSingle, children, ...other } = this.asProps;

    return sstyled(styles)(
      <>
        <STotalPagesLabel>{getI18nText('totalPagesLabel')}</STotalPagesLabel>
        {isLastOrSingle ? (
          <STotalLastPages
            aria-label={getI18nText('lastPage', { lastPageNumber: totalPages })}
            {...other}
          >
            {children}
          </STotalLastPages>
        ) : (
          <STotalPages
            render={ButtonLink}
            aria-label={getI18nText('lastPage', { lastPageNumber: totalPages })}
          />
        )}
      </>,
    );
  }
}

const PageInputValue = (props) => {
  const SPageInputValue = Root;

  return sstyled(props.styles)(<SPageInputValue render={Input.Value} />);
};

const PageInputAddon = (props) => {
  const SPageInputAddon = Root;
  return sstyled(props.styles)(<SPageInputAddon render={Input.Addon} />);
};

class PageInput extends Component {
  static enhance = [uniqueIDEnhancement()];

  render() {
    const SPageInput = Root;
    const SLabel = Text;
    const { Children, getI18nText, styles, uid } = this.asProps;

    return sstyled(styles)(
      <>
        <SLabel tag='label' htmlFor={`pagination-input-${uid}`}>
          {getI18nText('pageInputLabel')}
        </SLabel>
        <SPageInput render={Input} controlsLength={Children.origin ? undefined : 2}>
          {Children.origin ? (
            <Children />
          ) : (
            <Pagination.PageInput.Value id={`pagination-input-${uid}`} />
          )}
        </SPageInput>
      </>,
    );
  }
}

const Pagination = createComponent(PaginationRoot, {
  PrevPage,
  NextPage,
  FirstPage,
  TotalPages,
  PageInput: [
    PageInput,
    {
      Value: PageInputValue,
      Addon: PageInputAddon,
    },
  ],
});

export default Pagination;
