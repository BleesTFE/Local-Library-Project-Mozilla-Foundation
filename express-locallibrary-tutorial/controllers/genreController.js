const Genre = require("../models/genre");
const Author = require("../models/author");
const Book = require("../models/book");
const async = require("async");
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");


// Display list of all Genre.
exports.genre_list = (req, res) => {
    Genre.find()
        .sort([["name", "ascending"]])
        .exec(function (err, list_genre) {
            if (err) {
                return next(err);
            }
            //Successful, so render
            res.render("genre_list", {
                title: "Genre List",
                genre_list: list_genre,
            });
        });
};

// Display detail page for a specific Genre.
exports.genre_detail = (req, res, next) => {
    async.parallel(
        {
            genre(callback) {
                Genre.findById(req.params.id).exec(callback);
            },

            genre_books(callback) {
                Book.find({ genre: req.params.id }).exec(callback);
            },
        },
        (err, results) => {
            if (err) {
                return next(err);
            }
            if (results.genre == null) {
                // No results.
                const err = new Error("Genre not found");
                err.status = 404;
                return next(err);
            }
            // Successful, so render
            res.render("genre_detail", {
                title: "Genre Detail",
                genre: results.genre,
                genre_books: results.genre_books,
            });
        }
    );
};


// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
    res.render("genre_form", { title: "Create Genre" });
};


// Handle Genre create on POST.
exports.genre_create_post = [
    // Validate and sanitize the name field.
    body("name", "Genre name required").trim().isLength({ min: 1 }).escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a genre object with escaped and trimmed data.
        const genre = new Genre({ name: req.body.name });

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values/error messages.
            res.render("genre_form", {
                title: "Create Genre",
                genre,
                errors: errors.array(),
            });
            return;
        } else {
            // Data from form is valid.
            // Check if Genre with same name already exists.
            Genre.findOne({ name: req.body.name }).exec((err, found_genre) => {
                if (err) {
                    return next(err);
                }

                if (found_genre) {
                    // Genre exists, redirect to its detail page.
                    res.redirect(found_genre.url);
                } else {
                    genre.save((err) => {
                        if (err) {
                            return next(err);
                        }
                        // Genre saved. Redirect to genre detail page.
                        res.redirect(genre.url);
                    });
                }
            });
        }
    },
];


// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
    // Get details of author and all their books (in parallel)
    const [genre, allBooksInGenre] = await Promise.all([
        Genre.findById(req.params.id).exec(),
        Book.find({ genre: req.params.id }).exec(),
    ]);

    if (genre === null) {
        // No results.
        res.redirect("/catalog/genres");
    }

    res.render("genre_delete", {
        title: "Delete Genre",
        genre: genre,
        genre_books: allBooksInGenre,
    });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
    // Get details of genre and all their books (in parallel)
    const [genre, allBooksInGenre] = await Promise.all([
        Genre.findById(req.params.id).exec(),
        Book.find({ genre: req.params.id }).exec(),
    ]);

    if (allBooksInGenre.length > 0) {
        // Genre has books. Render in same way as for GET route.
        res.render("genre_form", {
            title: "Delete Genre",
            genre: genre,
            genre_books: allBooksInGenre,
        });
        return;
    } else {
        // Genre has no books. Delete object and redirect to the list of genres.
        await Genre.findByIdAndRemove(req.body.genreid);
        res.redirect("/catalog/genres");
    }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler( async(req, res, next) => {
    const [genre] = await Promise.all([
        Genre.findById(req.params.id).exec(),
    ])
    if (genre === null) {
        err = new Error("Genre not found");
        err.status = 404;
        return next(err);
    }
    res.render("genre_form", {
        title: "Update genre",
        genre: genre
    });
});

// Handle Genre update on POST.
exports.genre_update_post = [
        body("name", "Genre must not be empty")
        .trim()
        .isLength({min: 1})
        .escape(),
    // Process request after validation and sanitization.
    asyncHandler( async(req, res, next) => {
        const errors = validationResult(req);
        const genre = new Genre({
            name: req.body.name,
            _id: req.params.id,
        });
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form
            const [genre] = await Promise.all([
                Genre.findById(req.params.id).exec()
            ]);

            res.render("genre_form", {
                title: "Update genre",
                genre: genre,
                errors: errors.array(),
            });
            return;
        } else {
            const thegenre = await Genre.findByIdAndUpdate(req.params.id, genre, {});
            res.redirect(thegenre.url);
        }
    }),
];
