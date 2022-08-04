import { apiInitializer } from "discourse/lib/api";
import { logSearchLinkClick } from "discourse/lib/search";

export default apiInitializer("0.8", (api) => {
  const enableConnectorName = settings.plugin_outlet;
  const disableConnectorName =
    enableConnectorName === "above-main-container"
      ? "below-site-header"
      : "above-main-container";

  api.registerConnectorClass(disableConnectorName, "search-banner", {
    shouldRender() {
      return false;
    },
  });

  const { iconNode } = require("discourse-common/lib/icon-library");

  api.decorateWidget("header-buttons:after", helper => {
    if (!api.getCurrentUser()) return;

    let container = api.container,
        ntb_text = settings.New_topic_button_text,
        ntb_title = settings.New_topic_button_title.length
            ? settings.New_topic_button_title
            : ntb_text,
        ntb_icon = settings.New_topic_button_icon,
        ntb_button_class = "btn btn-default btn btn-icon-text",
        ntb_button_helper = "button#new-create-topic",
        ntb_label_helper = "span.d-button-label",
        composerModal = require("discourse/models/composer").default,
        composerController = container.lookup("controller:composer");

    const createTopic = function() {
      const controller = container.lookup("controller:navigation/category"),
          category = controller.get("category.id"),
          topicCategory = container
              .lookup("route:topic")
              .get("context.category.id"),
          categoryd = topicCategory ? topicCategory : category;

      composerController.open({
        action: composerModal.CREATE_TOPIC,
        categoryId: categoryd,
        draftKey: composerModal.DRAFT
      });
    };

    return helper.h(
        ntb_button_helper,
        {
          className: ntb_button_class,
          title: ntb_title,
          onclick: createTopic
        },
        [iconNode(ntb_icon), helper.h(ntb_label_helper, ntb_text)]
    );
  });

  // Simplified version of header search theme component
  const searchMenuWidget = api.container.factoryFor("widget:search-menu");
  const corePanelContents = searchMenuWidget.class.prototype["panelContents"];

  api.reopenWidget("search-menu", {
    buildKey(attrs) {
      let type = attrs.formFactor || "menu";
      return `search-${type}`;
    },

    defaultState(attrs) {
      return {
        formFactor: attrs.formFactor || "menu",
        showHeaderResults: false,
        inTopicContext: attrs.inTopicContext,
      };
    },

    html(attrs, state) {
      if (this.state.formFactor === "widget") {
        return this.panelContents();
      } else {
        return this._super(attrs, state);
      }
    },

    mouseDownOutside() {
      const formFactor = this.state.formFactor;
      if (formFactor === "menu") {
        return this.sendWidgetAction("toggleSearchMenu");
      } else {
        this.state.showHeaderResults = false;
        this.scheduleRerender();
      }
    },

    click() {
      const formFactor = this.state.formFactor;
      if (formFactor === "widget") {
        this.showResults();
      }
    },

    showResults() {
      this.state.showHeaderResults = true;
      this.scheduleRerender();
    },

    linkClickedEvent(attrs) {
      const { searchLogId, searchResultId, searchResultType } = attrs;
      if (searchLogId && searchResultId && searchResultType) {
        logSearchLinkClick({
          searchLogId,
          searchResultId,
          searchResultType,
        });
      }

      const formFactor = this.state.formFactor;

      if (formFactor === "widget") {
        this.state.showHeaderResults = false;
        this.scheduleRerender();
      }
    },

    panelContents() {
      const formFactor = this.state.formFactor;
      let showHeaderResults =
        this.state.showHeaderResults == null ||
        this.state.showHeaderResults === true;
      let contents = [];

      if (formFactor === "widget") {
        contents.push(
          this.attach("button", {
            icon: "search",
            className: "search-icon",
            action: "showResults",
          })
        );
      }

      contents = contents.concat(...corePanelContents.call(this));
      let results = contents.find((w) => w.name === "search-menu-results");
      if (results && results.attrs.results) {
        $(".search-menu.search-header").addClass("has-results");
      } else {
        $(".search-menu.search-header").removeClass("has-results");
      }
      if (formFactor === "menu" || showHeaderResults) {
        return contents;
      } else {
        return contents.filter((widget) => {
          return (
            widget.name !== "search-menu-results" &&
            widget.name !== "search-context"
          );
        });
      }
    },
  });

  api.createWidget("search-widget", {
    tagName: "div.search-widget",
  });

  api.decorateWidget("search-widget:after", function (helper) {
    const searchWidget = helper.widget;
    const searchMenuVisible = searchWidget.state.searchVisible;

    if (!searchMenuVisible && !searchWidget.attrs.topic) {
      return helper.attach("search-menu", {
        contextEnabled: searchWidget.state.contextEnabled,
        formFactor: "widget",
      });
    }
  });
});
