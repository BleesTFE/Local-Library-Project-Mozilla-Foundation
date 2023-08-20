const Book = require("../models/book");
const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const Author = require("../models/author");
const Genre = require("../models/genre");


exports.search_get = asyncHandler(async(req,res) => {
    const [books, authors] = await Promise.all([
        Book.find().exec(),
        Author.find().exec(),
    ]);
    res.render("search", {
        title: "Automatic Search",
        search: req.body.search_input,
        books: books,
        authors: authors,
        books_result: [],
        authors_result: [],
    });
});
exports.search_api = asyncHandler(async(req,res) => {
    try {
        const [books, authors] = await Promise.all([
            Book.find().exec(),
            Author.find().exec(),
        ]);
        // Convert the documents to plain objects with virtuals included
        const booksWithVirtuals = books.map(book => book.toObject({ virtuals: true }));
        const authorsWithVirtuals = authors.map(author => author.toObject({ virtuals: true }));

        res.json({ books: booksWithVirtuals, authors: authorsWithVirtuals });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching data' });
    }
});