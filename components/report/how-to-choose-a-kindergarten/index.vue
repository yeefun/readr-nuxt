<template>
  <div class="htcak">
    <div ref="header" class="header" :class="{ hidden: shouldHideHeader }">
      <div class="wrapper" :class="{ yellow: !shouldOpenGame }">
        <readr-header />
      </div>
      <RdNavbar
        :navItems="navItems"
        :activeId="activeNavItemId"
        @clickNavItem="handleClickNavItem"
      />
    </div>

    <div v-if="shouldOpenGame">
      <div class="cover-wrapper">
        <RdCover :cmsData="contentApiData.cover" />
      </div>
      <RdMultipleChoice
        :id="NAV_ITEMS_IDS[0]"
        :cmsData="contentApiData.game.multipleChoice"
        class="htcak__multiple-choice"
        @submitChoices="handleSubmitChoices"
        @skip="skipGame"
      />
    </div>

    <div v-if="!shouldOpenGame" class="result">
      <transition name="fade-in">
        <RdChoiceResult
          v-if="shouldOpenGameResult"
          :id="NAV_ITEMS_IDS[0]"
          v-intersect="intersectionObserver"
          :results="gameResults"
          @seeProfileStory="handleSeeProfileStory"
          @replayGame="replayGame"
        />
      </transition>

      <RdProfileStory
        :id="NAV_ITEMS_IDS[1]"
        v-intersect="intersectionObserver"
        :cmsData="contentApiData.profile"
      />

      <div id="report-article" v-intersect="intersectionObserver" />
    </div>
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import scrollIntoView from 'scroll-into-view'

import RdNavbar from './components/RdNavbar.vue'
import RdCover from './components/RdCover.vue'
import RdMultipleChoice from './components/RdMultipleChoice.vue'
import RdChoiceResult from './components/RdChoiceResult.vue'
import RdProfileStory from './components/RdProfileStory.vue'

import intersect from '~/components/helpers/directives/intersect.js'
import scrollDirection from '~/components/helpers/mixins/scroll-direction.js'

const NAV_ITEMS_IDS = ['game', 'profile-story', 'report-article']
const HEADER_HEIGHT_MD = 141

export default {
  name: 'HowToChooseAKindergarten',

  components: {
    RdNavbar,
    RdCover,
    RdMultipleChoice,
    RdChoiceResult,
    RdProfileStory,
  },

  directives: {
    intersect,
  },

  mixins: [scrollDirection],

  props: {
    cmsData: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },

  data() {
    return {
      shouldOpenGame: true,
      shouldOpenGameResult: false,
      gameResults: [],

      NAV_ITEMS_IDS: Object.freeze(NAV_ITEMS_IDS),
      navItems: Object.freeze([
        Object.freeze({
          id: NAV_ITEMS_IDS[0],
          name: '玩遊戲',
        }),
        Object.freeze({
          id: NAV_ITEMS_IDS[1],
          name: '找祕笈',
        }),
        Object.freeze({
          id: NAV_ITEMS_IDS[2],
          name: '看報導',
        }),
      ]),
      activeNavItemId: NAV_ITEMS_IDS[0],
      isAutoScrolling: false,

      intersectionObserver: undefined,
    }
  },

  computed: {
    contentApiData() {
      return this.cmsData.contentApiData
    },
    shouldHideHeader() {
      return !this.isAutoScrolling && this.isScrollingDown
    },
  },

  beforeMount() {
    this.unmountArticle()
    this.unmountExtras()
  },

  mounted() {
    this.intersectionObserver = new IntersectionObserver(this.handleIntersect, {
      threshold: 1,
      rootMargin: `-${HEADER_HEIGHT_MD + 8}px 0px 0px 0px`,
    })
  },

  beforeDestroy() {
    this.cleanupObserver()
  },

  methods: {
    ...mapMutations('report', [
      'unmountArticle',
      'showArticle',
      'hideArticle',
      'unmountExtras',
      'showExtras',
    ]),

    handleSubmitChoices(choicesByCategory) {
      this.setGameResults(choicesByCategory)
      this.openResult()
    },
    setGameResults(choicesByCategory = {}) {
      const sortedChoices = Object.entries(
        Object.assign({}, choicesByCategory)
      ).sort(function descendByChoicesCount(
        [, choicesA = []],
        [, choicesB = []]
      ) {
        return choicesB.length - choicesA.length
      })
      const [, maxChoices] = sortedChoices[0]
      const categories = sortedChoices
        .filter(function isEqualToMaxChoices([, choices]) {
          return choices.length === maxChoices.length
        })
        .map(function getCategory([category]) {
          return category
        })

      this.gameResults = categories.map(this.getResultBy)
    },
    openResult() {
      this.openGameResult()
      this.showMainBody()
    },
    getResultBy(category) {
      return (
        this.contentApiData.game.result.possibleResults.find(
          function byCategory(result) {
            return result.category === category
          }
        ) || {}
      )
    },

    skipGame() {
      this.showMainBody()
      this.activateNavItem(NAV_ITEMS_IDS[1])
    },
    async replayGame() {
      this.openGame()
      await this.$nextTick()
      this.jumpToTop()
      this.scrollTo(NAV_ITEMS_IDS[0])
      this.hideArticle()
      this.unmountExtras()
    },
    handleSeeProfileStory() {
      this.scrollTo(NAV_ITEMS_IDS[1])
    },
    showMainBody() {
      this.closeGame()
      this.jumpToTop()
      this.showArticle()
      this.showExtras()
    },
    openGame() {
      this.shouldOpenGame = true
      this.shouldOpenGameResult = false
    },
    closeGame() {
      this.shouldOpenGame = false
    },
    openGameResult() {
      this.shouldOpenGameResult = true
    },

    activateNavItem(id) {
      this.activeNavItemId = id
    },
    async handleClickNavItem(id) {
      switch (id) {
        case NAV_ITEMS_IDS[0]:
          if (!this.shouldOpenGame && !this.shouldOpenGameResult) {
            this.replayGame()
          } else {
            this.scrollTo(id)
          }
          break
        case NAV_ITEMS_IDS[1]:
          if (this.shouldOpenGame) {
            this.skipGame()
          } else {
            this.scrollTo(id)
          }
          break
        case NAV_ITEMS_IDS[2]:
          if (this.shouldOpenGame) {
            this.showMainBody()
            this.activateNavItem(NAV_ITEMS_IDS[1])
            await this.$nextTick()
          }
          this.scrollTo(id)
          break
      }
    },
    scrollTo(id) {
      this.activateNavItem(id)

      this.isAutoScrolling = true
      scrollIntoView(
        document.getElementById(id),
        {
          time: 450,
          align: {
            top: 0,
            topOffset: this.$refs.header.offsetHeight,
          },
          ease: function easeInQuad(t) {
            return t * t
          },
        },
        function onFinished() {
          setTimeout(() => {
            this.isAutoScrolling = false
            this.$data.$_scrollDirection_direction = 'up'
          }, 100)
        }.bind(this)
      )
    },
    jumpToTop() {
      window.scrollTo(0, 0)
    },

    handleIntersect(entries) {
      if (this.isAutoScrolling) {
        return
      }

      entries.forEach(({ isIntersecting, target }) => {
        if (isIntersecting) {
          if (!this.isScrollingDown) {
            this.activateNavItem(
              NAV_ITEMS_IDS[NAV_ITEMS_IDS.indexOf(target.id) - 1]
            )
          }
        } else if (this.isScrollingDown) {
          this.activateNavItem(target.id)
        }
      })
    },
    cleanupObserver() {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = undefined
    },
  },
}
</script>

<style lang="scss">
:root {
  --primary-color: #ffd41d;
  --secondary-color: #fff8db;
}

body {
  color: #2b2b2b;
}

.htcak {
  &-h1 {
    font-weight: 500;
    font-size: 28px;
    line-height: 36px;
    letter-spacing: 0.04em;
    @include media-breakpoint-up(md) {
      font-size: 32px;
      line-height: 44px;
    }
  }

  &-h2 {
    font-size: 24px;
    line-height: 36px;
    letter-spacing: 0.032em;
    font-weight: 500;

    @include media-breakpoint-up(md) {
      font-size: 28px;
      line-height: 40px;
    }
  }

  &-h3 {
    font-size: 20px;
    line-height: 30px;
    letter-spacing: 0.02em;
    font-weight: 500;
    @include media-breakpoint-up(md) {
      font-size: 22px;
    }
  }

  &-body {
    font-size: 18px;
    line-height: 36px;
    letter-spacing: 0.01em;
    font-weight: 300;
  }

  &-small {
    font-size: 16px;
    line-height: 24px;
    font-weight: 300;
  }
}

.report-article {
  &__title {
    &::after {
      content: '';
      display: block;
      background-color: #2b2b2b;
      width: 80px;
      height: 3px;
      margin: 12px auto 0 auto;
    }
  }
}

.report-extras {
  background-color: var(--secondary-color) !important;
}
</style>

<style lang="scss" scoped>
$header-height: 117px;
$header-height--md: 141px;

.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  transition: transform 0.3s ease-out;

  &.hidden {
    transform: translateY(-100%);
  }

  .wrapper {
    min-height: 68.63px;
    background-color: #fff;
    @include media-breakpoint-up(md) {
      min-height: 84.63px;
    }

    &.yellow {
      background-color: var(--primary-color);
    }
  }
}

readr-header {
  &::v-deep {
    h1 svg * {
      fill: #2b2b2b;
    }
  }
}

.cover-wrapper {
  padding-top: $header-height;
  background-color: var(--primary-color);
  @include media-breakpoint-up(md) {
    padding-top: $header-height--md;
  }
}

.result {
  background-color: #fffcf5;
  padding-top: $header-height;
  @include media-breakpoint-up(md) {
    padding-top: $header-height--md;
  }
}

.fade-in {
  &-enter-active {
    transition: opacity 0.15s ease-in;
  }

  &-enter {
    opacity: 0;
  }
}
</style>