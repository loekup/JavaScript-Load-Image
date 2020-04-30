/*
 * JavaScript Load Image Demo JS
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* global loadImage, $ */

$(function () {
  'use strict'

  var result = $('#result')
  var exifNode = $('#exif')
  var iptcNode = $('#iptc')
  var thumbNode = $('#thumbnail')
  var actionsNode = $('#actions')
  var coordinates
  var jcropAPI

  /**
   * Displays tag data
   *
   * @param {*} node jQuery node
   * @param {object} tags Tags map
   * @param {string} title Tags title
   */
  function displayTagData(node, tags, title) {
    var table = $('<table></table>')
    var row = $('<tr></tr>')
    var cell = $('<td></td>')
    var headerCell = $('<th colspan="2"></th>')
    var prop
    table.append(row.clone().append(headerCell.clone().text(title)))
    for (prop in tags) {
      if (Object.prototype.hasOwnProperty.call(tags, prop)) {
        if (typeof tags[prop] === 'object') {
          displayTagData(node, tags[prop], prop)
          continue
        }
        table.append(
          row
            .clone()
            .append(cell.clone().text(prop))
            .append(cell.clone().text(tags[prop]))
        )
      }
    }
    node.append(table).show()
  }

  /**
   * Displays the thumbnal image
   *
   * @param {*} node jQuery node
   * @param {string} thumbnail Thumbnail URL
   * @param {object} [options] Options object
   */
  function displayThumbnailImage(node, thumbnail, options) {
    if (thumbnail) {
      var link = $('<a></a>')
        .attr('href', loadImage.createObjectURL(thumbnail))
        .attr('download', 'thumbnail.jpg')
        .appendTo(node)
      loadImage(
        thumbnail,
        function (img) {
          link.append(img)
          node.show()
        },
        options
      )
    }
  }

  /**
   * Displays meta data
   *
   * @param {object} [data] Meta data object
   */
  function displayMetaData(data) {
    if (!data) return
    var exif = data.exif
    var iptc = data.iptc
    if (exif) {
      var thumbnail = exif.get('Thumbnail')
      if (thumbnail) {
        displayThumbnailImage(thumbNode, thumbnail.get('Blob'), {
          orientation: exif.get('Orientation')
        })
      }
      displayTagData(exifNode, exif.getAll(), 'TIFF')
    }
    if (iptc) {
      displayTagData(iptcNode, iptc.getAll(), 'IPTC')
    }
  }

  /**
   * Updates the results view
   *
   * @param {*} img Image or canvas element
   * @param {object} [data] Meta data object
   */
  function updateResults(img, data) {
    if (!(img.src || img instanceof HTMLCanvasElement)) {
      result.children().replaceWith($('<span>Loading image file failed</span>'))
      return
    }
    var content = $('<a></a>').append(img)
    result.children().replaceWith(content)
    if (data) {
      if (img.getContext) {
        actionsNode.show()
      }
      displayMetaData(data)
      result.data(data)
    } else {
      // eslint-disable-next-line no-param-reassign
      data = result.data()
    }
    if (data.imageHead) {
      if (data.exif) {
        // Reset Exif Orientation data:
        loadImage.writeExifData(data.imageHead, data, 'Orientation', 1)
      }
      img.toBlob(function (blob) {
        loadImage.replaceHead(blob, data.imageHead, function (newBlob) {
          content
            .attr('href', loadImage.createObjectURL(newBlob))
            .attr('download', 'image.jpg')
        })
      }, 'image/jpeg')
    }
  }

  /**
   * Displays the image
   *
   * @param {File|Blob|string} file File or Blob object or image URL
   */
  function displayImage(file) {
    var options = {
      maxWidth: result.width(),
      canvas: true,
      pixelRatio: window.devicePixelRatio,
      downsamplingRatio: 0.5,
      orientation: Number($('#orientation').val()) || true,
      imageSmoothingEnabled: $('#image-smoothing').is(':checked'),
      meta: true
    }
    exifNode.hide().find('table').remove()
    iptcNode.hide().find('table').remove()
    thumbNode.hide().empty()
    if (!loadImage(file, updateResults, options)) {
      result
        .children()
        .replaceWith(
          $(
            '<span>' +
              'Your browser does not support the URL or FileReader API.' +
              '</span>'
          )
        )
    }
  }

  /**
   * Handles drop and file selection change events
   *
   * @param {event} event Drop or file selection change event
   */
  function fileChangeHandler(event) {
    event.preventDefault()
    var originalEvent = event.originalEvent
    var target = originalEvent.dataTransfer || originalEvent.target
    var file = target && target.files && target.files[0]
    if (!file) {
      return
    }
    displayImage(file)
  }

  /**
   * Handles URL change events
   */
  function urlChangeHandler() {
    var url = $(this).val()
    if (url) displayImage(url)
  }

  // Hide URL/FileReader API requirement message in capable browsers:
  if (
    window.createObjectURL ||
    window.URL ||
    window.webkitURL ||
    window.FileReader
  ) {
    result.children().hide()
  }

  $(document)
    .on('dragover', function (e) {
      e.preventDefault()
      var originalEvent = event.originalEvent
      if (originalEvent) originalEvent.dataTransfer.dropEffect = 'copy'
    })
    .on('drop', fileChangeHandler)

  $('#file-input').on('change', fileChangeHandler)

  $('#url').on('change paste input', urlChangeHandler)

  $('#orientation').on('change', function () {
    var img = result.find('img, canvas')[0]
    if (img) {
      updateResults(
        loadImage.scale(img, {
          maxWidth: result.width() * window.devicePixelRatio,
          pixelRatio: window.devicePixelRatio,
          orientation: Number($('#orientation').val()) || true,
          imageSmoothingEnabled: $('#image-smoothing').is(':checked')
        })
      )
    }
  })

  $('#edit').on('click', function (event) {
    event.preventDefault()
    var imgNode = result.find('img, canvas')
    var img = imgNode[0]
    var pixelRatio = window.devicePixelRatio || 1
    var margin = img.width / pixelRatio >= 140 ? 40 : 0
    imgNode
      // eslint-disable-next-line new-cap
      .Jcrop(
        {
          setSelect: [
            margin,
            margin,
            img.width / pixelRatio - margin,
            img.height / pixelRatio - margin
          ],
          onSelect: function (coords) {
            coordinates = coords
          },
          onRelease: function () {
            coordinates = null
          }
        },
        function () {
          jcropAPI = this
        }
      )
      .parent()
      .on('click', function (event) {
        event.preventDefault()
      })
  })

  $('#crop').on('click', function (event) {
    event.preventDefault()
    var img = result.find('img, canvas')[0]
    var pixelRatio = window.devicePixelRatio || 1
    if (img && coordinates) {
      updateResults(
        loadImage.scale(img, {
          left: coordinates.x * pixelRatio,
          top: coordinates.y * pixelRatio,
          sourceWidth: coordinates.w * pixelRatio,
          sourceHeight: coordinates.h * pixelRatio,
          maxWidth: result.width() * pixelRatio,
          contain: true,
          pixelRatio: pixelRatio,
          imageSmoothingEnabled: $('#image-smoothing').is(':checked')
        })
      )
      coordinates = null
    }
  })

  $('#cancel').on('click', function (event) {
    event.preventDefault()
    if (jcropAPI) jcropAPI.release()
  })
})
