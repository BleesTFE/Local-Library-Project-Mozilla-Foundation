const Author = require("../models/author");
const async = require("async");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");
const {DateTime} = require("luxon");
const asyncHandler = require("express-async-handler");
const fileUpload = require("express-fileupload");
const express = require("express");
const path = require("path");

var app = express();
app.use(fileUpload({createParentPath:true,}));

// Display list of all Authors.
exports.author_list = function (req, res, next) {
    Author.find()
        .sort([["family_name", "ascending"]])
        .exec(function (err, list_authors) {
            if (err) {
                return next(err);
            }
            //Successful, so render
            res.render("author_list", {
                title: "Author List",
                author_list: list_authors,
            });
        });
};


// Display detail page for a specific Author.
exports.author_detail = (req, res, next) => {
    async.parallel(
        {
            author(callback) {
                Author.findById(req.params.id).exec(callback);
            },
            authors_books(callback) {
                Book.find({ author: req.params.id }, "title summary").exec(callback);
            },
        },
        (err, results) => {
            if (err) {
                // Error in API usage.
                return next(err);
            }
            if (results.author == null) {
                // No results.
                const err = new Error("Author not found");
                err.status = 404;
                return next(err);
            }
            // Successful, so render.
            res.render("author_detail", {
                title: "Author Detail",
                author: results.author,
                author_books: results.authors_books,
            });
        }
    );
};


// Display Author create form on GET.
exports.author_create_get = (req, res, next) => {
    res.render("author_form", { title: "Create Author" });
};

// Handle Author create on POST.
exports.author_create_post = [
    // Validate and sanitize fields.
    body("first_name")
        .trim()
        .isLength({ min: 1 })
        .escape()
        .withMessage("First name must be specified.")
        .isAlphanumeric()
        .withMessage("First name has non-alphanumeric characters."),
    body("family_name")
        .trim()
        .isLength({ min: 1 })
        .escape()
        .withMessage("Family name must be specified.")
        .isAlphanumeric()
        .withMessage("Family name has non-alphanumeric characters."),
    body("date_of_birth", "Invalid date of birth")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate(),
    body("date_of_death", "Invalid date of death")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate(),
    // Process request after validation and sanitization.
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render("author_form", {
                title: "Create Author",
                author: req.body,
                errors: errors.array(),
            });
            return;
        }
        // Data from form is valid.
        if (!req.files) {
            return res.status(400).send("No files were uploaded.");
        }
        const file = req.files.upload_file;
        const path = "C:/Users/alluc/OneDrive/Dokumenter/GitHub/Local-Library-Project-Mozilla-Foundation/express-locallibrary-tutorial/public/images/" + (Math.floor(Math.random() * 10000)) + file.name;
        file.mv(path);
        // Create an Author object with escaped and trimmed data.
        const author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            image_path: "/images/" + file.name,
        });
        author.save((err) => {
            if (err) {
                return next(err);
            }
            // Successful - redirect to new author record.
            res.redirect(author.url);
        });
    },
];


// Display Author delete form on GET.
exports.author_delete_get = asyncHandler(async (req, res, next) => {
    // Get details of author and all their books (in parallel)
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.params.id).exec(),
        Book.find({ author: req.params.id }, "title summary").exec(),
    ]);

    if (author === null) {
        // No results.
        res.redirect("/catalog/authors");
    }

    res.render("author_delete", {
        title: "Delete Author",
        author: author,
        author_books: allBooksByAuthor,
    });
});


// Handle Author delete on POST.
// Handle Author delete on POST.
exports.author_delete_post = asyncHandler(async (req, res, next) => {
    // Get details of author and all their books (in parallel)
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.params.id).exec(),
        Book.find({ author: req.params.id }, "title summary").exec(),
    ]);

    if (allBooksByAuthor.length > 0) {
        // Author has books. Render in same way as for GET route.
        res.render("author_delete", {
            title: "Delete Author",
            author: author,
            author_books: allBooksByAuthor,
        });
        return;
    } else {
        // Author has no books. Delete object and redirect to the list of authors.
        await Author.findByIdAndRemove(req.body.authorid);
        res.redirect("/catalog/authors");
    }
});


// Display author update form on GET.
exports.author_update_get = asyncHandler(async (req, res, next) => {
    // Get book, authors and genres for form.
    const [author] = await Promise.all([
        Author.findById(req.params.id).exec(),
    ]);

    if (author === null) {
        // No results.
        const err = new Error("Author not found");
        err.status = 404;
        return next(err);
    }

    res.render("author_form", {
        title: "Update author",
        author: author,
    });
});


// Handle author update on POST.
exports.author_update_post = [
    // Validate and sanitize fields.
    body("first_name", "First name must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("family_name", "Family name must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("date_of_birth", "Invalid date")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate(),
    body("date_of_death", "Invalid date")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate(),
    // Process request after validation and sanitization.
    asyncHandler(async (req, res, next) => {
        // Extract the validation errors from a request.

        if (!req.files) {
            return res.status(400).send("No files were uploaded.");
        }
        const file = req.files.upload_file;
        const path = "C:/Users/alluc/OneDrive/Dokumenter/GitHub/Local-Library-Project-Mozilla-Foundation/express-locallibrary-tutorial/public/images/" + file.name;
        file.mv(path);
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        const author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id, // This is required, or a new ID will be assigned!
            image_path: "/images/" + file.name,
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form
            const [author] = await Promise.all([
                Author.findById(req.params.id).exec(),
            ]);
            res.render("author_form", {
                title: "Update author",
                author: author,
                date_of_birth: author.date_of_birth_yyyy_mm_dd,
                date_of_death: author.date_of_death_yyy_mm_dd,
                errors: errors.array(),
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, author, {});
            // Redirect to book detail page.
            res.redirect(updatedAuthor.url);
        }
    }),
];
